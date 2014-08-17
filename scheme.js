/**
 * scheme.js:  a simple scheme-like interpreter based on Peter Norvig's
 *             implementation (http://norvig.com/lispy.html).
 */
(function (exports) {
    'use strict';

    // Add some standard mappings to the environment
    var globalEnv = new Env({
        '+':       expect(function (a, b) { return a + b }, 2),
        '-':       expect(function (a, b) { return a - b }, 2),
        '*':       expect(function (a, b) { return a * b }, 2),
        '/':       expect(function (a, b) { return a / b }, 2),
        'not':     expect(function (x)    { return !x }, 1),

        // NOTE: Javascript does not allow accessing references, so I have
        //       just mapped all equality predicates to `a == b`.
        '=':       expect(function (a, b) { return a == b }, 2),
        'eq?':     expect(function (a, b) { return a == b }, 2),
        'equal?':  expect(function (a, b) { return a == b }, 2),

        '<':       expect(function (a, b) { return a < b  }, 2),
        '>':       expect(function (a, b) { return a > b  }, 2),
        '<=':      expect(function (a, b) { return a <= b }, 2),
        '>=':      expect(function (a, b) { return a >= b }, 2),

        'length':  expect(function (l)    { return l.length }, 1),
        'cons':    expect(function (x, y) {
            return
                Array.concat(
                    x instanceof Array ? x : [x],
                    y instanceof Array ? y : [y]
                );
        }, 2),
        'car':     expect(function (x) { return x[0] }, 1),
        'cdr':     expect(function (x) { return x.slice(1) }, 1),

        // list takes any number of arguments
        'list':    function ()  {
            return Array.prototype.slice.call(arguments)
        },

        'list?':   expect(function (l) { return l instanceof Array }, 1),
        'null?':   expect(function (l) { return l == [] }, 1),
        'symbol?': expect(function (x) { return typeof x == 'string' }, 1)
    }, {
        // Throw an error if reached top scope without finding mapping
        find: function () {
            return {
                get: function (sym) { throw new Error(sym + 'is undefined') }
            }
        }
    });

    /**
     * Environment class containing the identifier mappings for the current
     * scope.
     */
    function Env(env, outer) {
        /**
         * Recursively looks up a symbol from the minimum scope up.
         *
         * @class Env
         * @param {string} sym - Symbol to look up
         * @return {Env} Environment containing this symbol's mapping
         */
        this.find = function (sym) {
            if (sym in env) {
                return this;
            } else {
                return outer.find(sym);
            }
        };

        /**
         * Returns the mapped value of the specified symbol in this scope.
         *
         * @class Env
         * @param {string} sym - Symbol to look up
         * @return Value the symbol maps to
         */
        this.get = function (sym) {
            return env[sym];
        };

        /**
         * Sets a mapping between a symbol and a function.
         *
         * @class Env
         * @param {string} sym - Symbol to add mapping for
         * @param fun - Function or atom to map to
         */
        this.set = function (sym, fun) {
            env[sym] = fun;
        }
    }

    /**
     * Ensures that a function receives the expected number of arguments.
     *
     * @param {function} fun - Function to run
     * @param {number}   num - Expected number of arguments
     * @return The return value of the function
     */
    function expect(fun, num) {
        return function () {
            if (arguments.length != num) {
                throw new SyntaxError('Argument length mismatch,'
                        + ' expected ' + num + ' but received '
                        + arguments.length);
            }
            return fun.apply(this, Array.prototype.slice.call(arguments));
        };
    }

    /**
     * Evaluates an expression.
     *
     * @param {array} x - Parsed representation of the expression
     * @param {Env} env - Scope to evaluate the expression in
     * @return Evaluated form of expression
     */
    function evaluate(x, env) {
        if (typeof x == 'string') {
            return env.find(x).get(x);
        } else if (!(x instanceof Array)) {
            return x;
        } else if (x[0] == 'quote') {
            return x[1];
        } else if (x[0] == 'if') {
            var condition = x[1];
            var block = x[2];
            var elseBlock = x[3];
            return evaluate(evaluate(condition, env) ? block : elseBlock, env);
        } else if (x[0] == 'set!') {
            var v = x[1];
            var exp = x[2];
            env.find(v).set(v, evaluate(exp, env));
        } else if (x[0] == 'define') {
            var v = x[1];
            var exp = x[2];
            env.set(v, evaluate(exp, env));
        } else if (x[0] == 'lambda') {
            var vs = x[1];
            var exp = x[2];

            return expect(function () {
                var args = Array.prototype.slice.call(arguments);
                var params = {};
                for (var i = 0; i < args.length; i++) {
                    params[vs[i]] = args[i];
                }
                return evaluate(exp, new Env(params, env));
            }, vs.length);
        } else if (x[0] == 'begin') {
            var exps = x.slice(1);
            var val;
            for (var i = 0; i < exps.length; i++) {
                val = evaluate(exps[i], env);
            }
            return val;
        } else {
            var exps = [];
            for (var i = 0; i < x.length; i++) {
                exps.push(evaluate(x[i], env));
            }
            var proc = exps.shift();

            // Args checked in function created by lambda
            return proc.apply(this, exps);
        }
    }

    /**
     * Parses a string.
     *
     * @param {string} str - String to parse
     * @return {array} AST representation of given string
     */
    function parse(str) {
        return read_from(tokenize(str));
    }

    /**
     * Tokenizes a string.
     *
     * @param {string} str - String to tokenize
     * @return {array} Array of tokens
     */
    function tokenize(str) {
        return str
                .replace(/\(/g, ' ( ')
                .replace(/\)/g, ' ) ')
                .trim()
                .split(/\s+/g);
    }

    /**
     * Parses an array of tokens into an AST.
     *
     * @param {array} - Array of tokens
     * @return {array} AST representation of given string
     */
    function read_from(tokens) {
        if (tokens.length === 0) {
            throw new SyntaxError('Unexpected EOF while reading');
        }

        var token = tokens.shift();

        if (token == '(') {
            // Recursively parse sexpr
            var L = [];
            while (tokens[0] != ')') {
                L.push(read_from(tokens));
            }
            tokens.shift();
            return L;
        } else if (token[0] == ')') {
            // Non-matching ")" case
            throw new SyntaxError('Mismatched paren error');
        } else {
            return atom(token);
        }
    }

    /**
     * Parses an atom, the smallest unit in Lisps.
     *
     * @param {string} token - Token to be parsed
     * @return Either a string or a number
     */
    function atom(token) {
        var n = parseInt(token, 10);
        if (!isNaN(n)) {
            return n;
        } else {
            return token;
        }
    }

    /**
     * Returns a readable representation of the AST returned by `evaluate`.
     *
     * @param exp - AST representation of evaluated result
     * @return {string} Scheme-ified AST string
     */
    function stringify(exp) {
        if (typeof exp == 'string' || typeof exp == 'number') {
            return exp.toString();
        } else if (typeof exp == 'undefined') {
            return '[No output]';
        } else if (exp instanceof Array) {
            var exps = [];
            for (var i = 0; i < exp.length; i++) {
                exps.push(stringify(exp[i]));
            }
            return '(' + ' '.join(exps) + ')';
        }
    }

    /**
     * Evaluates a string. Essentially a wrapper for parse() -> evaluate().
     *
     * @param {string} str - String to parse
     * @return {string} Result of evaluation
     */
    function run(str) {
        return stringify(evaluate(parse(str), globalEnv));
    }

    // Export `evaluate`, `parse`, and `run` as `Scheme.eval`, `Scheme.parse`,
    // and `Scheme.run` respectively.
    exports.Scheme = {
        eval: evaluate,
        parse: parse,
        run: run
    };

}) (this);

