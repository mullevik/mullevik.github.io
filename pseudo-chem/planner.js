

const x = 3;


class Grouping {
    constructor(mapping, basicGroups) {
        this.mapping = mapping;
        this.basicGroups = basicGroups;
    }

    static fromText(lines, basics) {

        let mapping = {}

        for (let line of lines) {
            const split = line.split(/\s/g);
            const name = split[0];
            if (name === "") continue;
            const terms = split.slice(2);
            mapping[name] = terms;
        }

        const basicGroups = basics.split(/\s/g);

        for (let g of basicGroups) {
            if (g === "") continue;
            if (! (g in mapping)) throw SyntaxError(`${g} not in groups`);
        }

        return new Grouping(mapping, basicGroups.filter(x => x !== ""));
    }

    isTermBasic(term) {
        for (let group of Object.keys(this.mapping)) {
            const groupTerms = this.mapping[group];
            groupTerms

            if ((groupTerms.includes(term)) 
            && (this.basicGroups.includes(group))) return true; 
        }
        return false;
    }
}


class State {

    constructor(terms) {
        this.terms = terms;
    }

    static fromText(string) {
        let terms = {};
        const string_terms = string.split(/\s/g);
        for (let term of string_terms) {
            if (term === "") continue;

            let name = term.split(/^\d*/)[1];
            let amount;
            if (name === undefined) {
                name = term;
                amount = "1";
            } else {
                amount = term.replace(name, "");
            }

            const amount_number = amount === "" ? 0 : parseInt(amount);
            terms[name] = amount_number;
        }

        return new State(terms);
    }

    copy() {
        let newTerms = {};
        for (let term of Object.keys(this.terms)) {
            newTerms[term] = this.terms[term];
        }
        return new State(newTerms);
    }

    addTerms(terms) {
        for (let term of Object.keys(terms)) {
            if (term in this.terms) {
                this.terms[term] += terms[term];
            } else {
                this.terms[term] = terms[term];
            }
        }
        return this;
    }

    removeTerms(terms, grouping) {
        if (! this.includesTerms(terms, grouping))
        throw EvalError(`state ${this} does not include terms ${terms}`);
        
        for (let term of Object.keys(terms)) {
            if (term in this.terms) {
                this.terms[term] -= terms[term];
            }
        }
        return this;
    }

    includesTerms(terms, grouping) {
        for (let term of Object.keys(terms)) {
            const amount = terms[term];
            if (amount == 0) continue;
            if (grouping.isTermBasic(term)) continue;
            
            if (!(term in this.terms)) return false;

            const state_amount = this.terms[term];
            if (state_amount < amount) return false;
        }
        return true;
    }

    isSimilar(state, grouping) {
        // similar states are those, which have all non-basic terms equal
        
        for (let term of Object.keys(state.terms)) {
            if (! grouping.isTermBasic(term)) {
                const amount = state.terms[term];
                if (amount != 0) {
                    if (! (term in this.terms)) return false;
                    if (state.terms[term] !== this.terms[term]) return false;
                }
            }
        }

        for (let term of Object.keys(this.terms)) {
            if (! grouping.isTermBasic(term)) {
                const amount = this.terms[term];
                if (amount != 0) {
                    if (! (term in state.terms)) return false;
                    if (state.terms[term] !== this.terms[term]) return false;
                }
            }
        }
        return true;
    }

    certificate(grouping) {
        let terms = [];
        for (let term of Object.keys(this.terms)) {
            if (! grouping.isTermBasic(term)) {
                terms.push([term, this.terms[term]]);
            }
        }

        terms.sort((a, b) => {
            if (a[0] < b[0]) {
                return -1;
            }
            if (a[0] > b[0]) {
                return 1;
            }
            return 0;
        });

        let out = "";
        for (let term of terms) {
            out += `${term[1]}${term[0]} `;
        }
        return out;
    }

    toString() {
        let out = "";
        for (let key of Object.keys(this.terms)) {
            const amount = this.terms[key];
            if (amount > 0) out += `${amount}${key} `;
        }
        return out;
    }
}


class Operator {

    constructor(name, inputTerms, outputTerms) {
        this.name = name;
        this.inputTerms = inputTerms;
        this.outputTerms = outputTerms;
    }

    static fromText(text, grouping) {
        if (text === "") return [];
        const name = text.split(":")[0]
        const inputText = text.split(":")[1].split("->")[0];
        const outputText = text.split(":")[1].split("->")[1];
        
        const inState = State.fromText(inputText);
        const outState = State.fromText(outputText);

        let inStateGroups = [];
        for (let term of Object.keys(inState.terms)) {
            if (term in grouping.mapping) {
                inStateGroups.push(term);
            }
        }
        let outStateGroups = [];
        for (let term of Object.keys(outState.terms)) {
            if (term in grouping.mapping) {
                outStateGroups.push(term);
            }
        }

        if (inStateGroups.length > 0) {
            if (inStateGroups.length > 1) 
            throw new SyntaxError(`Bad grouping for operator ${name}`);
            if (outStateGroups.length > 1) 
            throw new SyntaxError(`Bad grouping for operator ${name}`);
            let operators = [];
            const groupLength = grouping.mapping[inStateGroups[0]].length;

            const inGroup = inStateGroups[0];
            const inAmount = inState.terms[inGroup];
            
            if (outStateGroups.length > 0) {
                const outGroup = outStateGroups[0];
                const outAmount = outState.terms[outGroup];
                for (let j = 0; j < groupLength; j ++) {
                    const inTerm = grouping.mapping[inGroup][j];
                    const outTerm = grouping.mapping[outGroup][j];

                    const newInState = inState.copy();
                    newInState.removeTerms({[inGroup]: inAmount}, grouping);
                    newInState.addTerms({[inTerm]: inAmount});
                    
                    const newOutState = outState.copy();
                    newOutState.removeTerms({[outGroup]: outAmount}, grouping);
                    newOutState.addTerms({[outTerm]: outAmount});

                    operators.push(new Operator(`${name}_${j}`, 
                                newInState.terms, newOutState.terms));
                }
            } else {
                for (let j = 0; j < groupLength; j ++) {
                    const inTerm = grouping.mapping[inGroup][j];
                    
                    const newInState = inState.copy();
                    newInState.removeTerms({[inGroup]: inAmount}, grouping);
                    newInState.addTerms({[inTerm]: inAmount});
                    
                    operators.push(new Operator(`${name}_${j}`, 
                    newInState.terms, outState.terms));
                }
            }
            return operators;
        }
        return [new Operator(name, inState.terms, outState.terms)];
    }

    toString() {
        let out = "";
        out += `${this.name}: `;
        for (let term of Object.keys(this.inputTerms)) {
            const amount = this.inputTerms[term];
            if (amount > 0) out += `${amount}${term} `;
        }
        out += "-> ";
        for (let term of Object.keys(this.outputTerms)) {
            const amount = this.outputTerms[term];
            if (amount > 0) out += `${amount}${term} `;
        }
        return out;
    }

    isApplicable(state, grouping) {
        if (state.includesTerms(this.inputTerms, grouping)) return true;
        return false;
    }

    apply(state, grouping) {
        const newState = state.copy();
        newState.removeTerms(this.inputTerms, grouping);
        newState.addTerms(this.outputTerms);
        return newState;
    }

}

function isVisited(visitedStates, state, grouping) {
    const stateCertificate = state.certificate(grouping);
    return visitedStates.has(stateCertificate);
}

function applicableOperators(operators, state, grouping) {
    let applicableOperators = [];
    for (let operator of operators) {
        if (operator.isApplicable(state, grouping)) {
            applicableOperators.push(operator);
        }
    }
    return applicableOperators;
}

function extractSequence(state) {
    let sequence = [];

    let current = state;

    while (current !== undefined) {
        sequence.push(current);
        current = current.parent;
    }

    return sequence.reverse();
}

function solve(grouping, operators, initialState, goalState, maxDistance) {
    initialState.distance = 0;
    
    const bfsQueue = [initialState];

    const visitedStates = new Set();
    visitedStates.add(initialState.certificate(grouping));

    while (bfsQueue.length > 0) {

        const currentState = bfsQueue.shift();

        for (let operator of 
            applicableOperators(operators, currentState, grouping)) {
            
            const nextState = operator.apply(currentState, grouping);
            nextState.parent = currentState;
            nextState.operator = operator;
            nextState.distance = currentState.distance + 1;

            if (nextState.isSimilar(goalState, grouping)) {
                return extractSequence(nextState);
            }

            if ((! isVisited(visitedStates, nextState, grouping)) 
            && (nextState.distance < maxDistance)) {
                visitedStates.add(nextState.certificate(grouping));
                bfsQueue.push(nextState);
            }
        }
    }

    return null;
}


function test() {
    const g = Grouping.fromText(["g1 = a b c", "g2 = e f g", "g3 = h i j"], "g1 g2");
    g;
    
    const goalInput = "3h 2i 2k";
    Sg = State.fromText(goalInput);


    Si = new State({});

    o1 = Operator.fromText("f: 2a 3b -> 9h 2i");
    o1;

    console.log(o1.isApplicable(Si, g));

    const S1 = o1.apply(Si, g);

    const S50 = new State({k: 8, i: 3, a: 10});
    const S51 = new State({k: 8, i: 3, b: 3});

    console.log(S50.isSimilar(S51, g));


}
// test();

function ex1() {
    const g = Grouping.fromText(
        ["g1 = a b c", "g2 = e f g", "g3 = h i j", "g4 = k l m"], 
        "g1 g2");
    g;
    
    const operators = [
        Operator.fromText("01: g2 a -> h", g),
        // Operator.fromText("02: f a -> 2h"),
        // Operator.fromText("03: g a -> 2h"),
        Operator.fromText("11: g1 g -> 2g4", g),
        // Operator.fromText("12: b g -> 2l"),
        // Operator.fromText("13: c g -> 2m"),
        Operator.fromText("21: 2g4 h -> 2g3", g),
        // Operator.fromText("22: 2l h -> 2i"),
        // Operator.fromText("23: 2m h -> 2j"),
        Operator.fromText("crush: 2g3 c -> g3 g a", g),
    ].flat();
    const goalInput = "i";
    Sg = State.fromText(goalInput);

    Si = new State({});


    const sequence = solve(g, operators, Si, Sg, 20);

    for (let state of sequence) {
        console.log(`${state.operator}`);
        console.log(`${state}`);
    }
    sequence;

}

ex1();
