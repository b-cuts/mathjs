
/**
 * Scope
 * A scope stores functions.
 *
 * @constructor math.expr.Scope
 * @param {Scope} [parentScope]
 */
math.expr.Scope = function (parentScope) {
    /** @type {math.expr.Scope} */
    this.parentScope = parentScope;

    /** @type {math.expr.Scope[]} */
    this.nestedScopes = undefined;

    /** @type {Object.<string, math.expr.Symbol>} */
    this.symbols = {}; // the actual symbols

    // the following objects are just used to test existence.
    this.defs = {};    // definitions by name (for example "a = [1, 2; 3, 4]")
    this.updates = {}; // updates by name     (for example "a(2, 1) = 5.2")
    this.links = {};   // links by name       (for example "2 * a")
};

// TODO: rethink the whole scoping solution again. Try to simplify

math.expr.Scope.prototype = {
    /**
     * Create a nested scope
     * The variables in a nested scope are not accessible from the parent scope
     * @return {math.expr.Scope} nestedScope
     */
    createNestedScope: function () {
        var nestedScope = new math.expr.Scope(this);
        if (!this.nestedScopes) {
            this.nestedScopes = [];
        }
        this.nestedScopes.push(nestedScope);
        return nestedScope;
    },

    /**
     * Clear all symbols in this scope and its nested scopes
     * (parent scope will not be cleared)
     */
    clear: function () {
        this.symbols = {};
        this.defs = {};
        this.links = {};
        this.updates = {};

        if (this.nestedScopes) {
            var nestedScopes = this.nestedScopes;
            for (var i = 0, iMax = nestedScopes.length; i < iMax; i++) {
                nestedScopes[i].clear();
            }
        }
    },

    /**
     * create a symbol
     * @param {String} name
     * @return {math.expr.Symbol} symbol
     * @private
     */
    createSymbol: function (name) {
        var symbol = this.symbols[name];
        if (!symbol) {
            // get a link to the last definition
            var lastDef = this.findDef(name);

            // create a new symbol
            symbol = new math.expr.Symbol(name, lastDef);
            this.symbols[name] = symbol;

        }
        return symbol;
    },

    /**
     * create a link to a value.
     * @param {String} name
     * @return {math.expr.Symbol} symbol
     */
    createLink: function (name) {
        var symbol = this.links[name];
        if (!symbol) {
            symbol = this.createSymbol(name);
            this.links[name] = symbol;
        }
        return symbol;
    },

    /**
     * Create a variable definition
     * Returns the created symbol
     * @param {String} name
     * @param {*} [value]
     * @return {math.expr.Symbol} symbol
     */
    createDef: function (name, value) {
        var symbol = this.defs[name];
        if (!symbol) {
            // create a new symbol
            symbol = this.createSymbol(name);
            this.defs[name] = symbol;

            // update the symbols value
            if (value != undefined) {
                symbol.set(value);
            }

            // link undefined symbols in nested scopes to this symbol
            var undef = this.getUndefinedSymbols(name);
            if (undef.length) {
                undef.forEach(function (u) {
                    if (u != symbol) {
                        u.set(symbol);
                    }
                });
            }
        }
        else {
            // update the symbols value
            if (value != undefined) {
                symbol.set(value);
            }
        }
        return symbol;
    },

    /**
     * Create a variable update definition
     * Returns the created symbol
     * @param {String} name
     * @return {math.expr.Symbol} symbol
     */
    createUpdate: function (name) {
        var symbol = this.updates[name];
        if (!symbol) {
            // create a new symbol
            symbol = this.createLink(name);
            this.updates[name] = symbol;

            // link undefined symbols in nested scopes to this symbol
            var undef = this.getUndefinedSymbols(name);
            if (undef.length) {
                undef.forEach(function (u) {
                    if (u != symbol) {
                        u.set(symbol);
                    }
                });
            }
        }
        return symbol;
    },

    /**
     * Create a constant
     * @param {String} name
     * @param {*} value
     * @return {math.expr.Symbol} symbol
     * @private
     */
    createConstant: function (name, value) {
        var symbol = new math.expr.Symbol(name, value);
        this.symbols[name] = symbol;
        this.defs[name] = symbol;
        return symbol;
    },

    /**
     * get the link to a symbol definition or update.
     * If the symbol is not found in this scope, it will be looked up in its parent
     * scope.
     * @param {String} name
     * @return {math.expr.Symbol | undefined} symbol, or undefined when not found
     */
    findDef: function (name) {
        var symbol;

        // check scope
        symbol = this.defs[name];
        if (symbol) {
            return symbol;
        }
        symbol = this.updates[name];
        if (symbol) {
            return symbol;
        }

        // check parent scope
        if (this.parentScope) {
            return this.parentScope.findDef(name);
        }
        else {
            // this is the root scope (has no parent),
            // try to load constants, functions, or unit from the library

            // check function (and load the function), for example "sin" or "sqrt"
            // search in the mathnotepad.math namespace for this symbol
            var fn = math[name];
            if (fn) {
                return this.createConstant(name, fn);
            }

            // Check if token is a unit
            if (Unit.isPlainUnit(name)) {
                var unit = new Unit(null, name);
                return this.createConstant(name, unit);
            }
        }

        return undefined;
    },

    /**
     * Set a symbol to undefined (if defined)
     * @param {String} name
     */
    setUndefined: function (name) {
        var symbol = this.symbols[name];
        if (symbol) {
            symbol.set(undefined);
        }
    },

    /**
     * Remove a link to a symbol
     * @param {String} name
     */
    removeLink: function (name) {
        delete this.links[name];
    },

    /**
     * Remove a definition of a symbol
     * @param {String} name
     */
    removeDef: function (name) {
        delete this.defs[name];
    },

    /**
     * Remove an update definition of a symbol
     * @param {String} name
     */
    removeUpdate: function (name) {
        delete this.updates[name];
    },

    /**
     * initialize the scope and its nested scopes
     *
     * All functions are linked to their previous definition
     * If there is no parentScope, or no definition of the func in the parent scope,
     * the link will be set undefined
     */
    init: function () {
        var symbols = this.symbols;
        var parentScope = this.parentScope;

        for (var name in symbols) {
            if (symbols.hasOwnProperty(name)) {
                var symbol = symbols[name];
                symbol.set(parentScope ? parentScope.findDef(name) : undefined);
            }
        }

        if (this.nestedScopes) {
            this.nestedScopes.forEach(function (nestedScope) {
                nestedScope.init();
            });
        }
    },

    /**
     * Check whether this scope or any of its nested scopes contain a link to a
     * symbol with given name
     * @param {String} name
     * @return {boolean} hasLink   True if a link with given name is found
     */
    hasLink: function (name) {
        if (this.links[name]) {
            return true;
        }

        if (this.nestedScopes) {
            var nestedScopes = this.nestedScopes;
            for (var i = 0, iMax = nestedScopes.length; i < iMax; i++) {
                if (nestedScopes[i].hasLink(name)) {
                    return true;
                }
            }
        }

        return false;
    },

    /**
     * Check whether this scope contains a definition of a symbol with given name
     * @param {String} name
     * @return {boolean} hasDef   True if a definition with given name is found
     */
    hasDef: function (name) {
        return (this.defs[name] != undefined);
    },

    /**
     * Check whether this scope contains an update definition of a symbol with
     * given name
     * @param {String} name
     * @return {boolean} hasUpdate   True if an update definition with given name is found
     */
    hasUpdate: function (name) {
        return (this.updates[name] != undefined);
    },

    /**
     * Retrieve all undefined symbols
     * @param {String} [name]  Optional name to filter the undefined symbols
     * @return {math.expr.Symbol[]} undefinedSymbols   All symbols which are undefined
     */
    getUndefinedSymbols: function (name) {
        var symbols = this.symbols;
        var undefinedSymbols = [];
        for (var i in symbols) {
            if (symbols.hasOwnProperty(i)) {
                var symbol = symbols[i];
                if (symbol.value == undefined && (!name || symbol.name == name)) {
                    undefinedSymbols.push(symbol);
                }
            }
        }

        if (this.nestedScopes) {
            this.nestedScopes.forEach(function (nestedScope) {
                undefinedSymbols = undefinedSymbols.concat(
                    nestedScope.getUndefinedSymbols(name));
            });
        }

        return undefinedSymbols;
    }
};
