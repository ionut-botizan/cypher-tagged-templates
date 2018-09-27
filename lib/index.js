"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
class DangerousTextErr extends Error {
}
exports.DangerousTextErr = DangerousTextErr;
class CypherHelper {
    constructor(config = {}) {
        this.query = Object.assign((strings, ...params) => {
            return new CypherQuery(this.config, strings, params);
        }, {
            /**
             *
             */
            raw: (strings, ...params) => {
                if (params.some(name => !/^\w+$/.test(name))) {
                    throw new DangerousTextErr("raw text can only have interpolated values that resolve to alphanumerics and/or underscores");
                }
                return new CypherRawText(strings.reduce((accumulator, string, i, arr) => {
                    if (i === arr.length - 1) {
                        return accumulator + string;
                    }
                    else {
                        return accumulator + string + params[i];
                    }
                }, ""));
            },
            /**
             * Plucks whitelisted keys and values and inserts them
             * as key value pairs seperated by commas, so that they
             * can be inserted into a Cypher query object.
             * @param propsWhitelist
             * an array of properties to whitelist from the `object`
             * @param object
             * object to be whitelisted
             *
             * @example
             *  cql`MATCH (m:Movie:NewRelease {${cql.fromProps(
             * 	["title", "release"],
             * 	{title: "Bee Movie", release: new Date().toString()}
             * )}}) RETURN m`
             */
            fromProps: function (propsWhitelist, object) {
                return this `${propsWhitelist
                    .map((prop, i, arr) => {
                    if (i === arr.length - 1) {
                        return [this.raw `${prop}: `, object[prop]];
                    }
                    else {
                        return [
                            this.raw `${prop}: `,
                            object[prop],
                            this.raw `, `
                        ];
                    }
                })
                    .reduce((a, b) => a.concat(b), [])}`;
            }
        });
        this.config = {
            driver: null,
            parseIntegers: false,
            rawResults: false
        };
        this.config = Object.assign({ parseIntegers: false }, config);
        this.query.bind(this);
        this.query.fromProps.bind(this.query);
    }
}
exports.default = CypherHelper;
/**
 * Don't export this they can use nested cypher``
 * statements for static text or various helpers to get dynamic text
 * like cypher.label, cypher.id, and cypher.prop.
 */
class CypherRawText {
    constructor(text) {
        this.text = "";
        this.text = text;
    }
}
class CypherQuery {
    constructor(config, strings, params = []) {
        this.config = config;
        this.strings = strings;
        this.params = params;
    }
    export(prefix = "p") {
        let query = "";
        let params = {};
        for (let i = 0, l = this.strings.length; i < l; i++) {
            const name = `${prefix}_${i}`;
            const param = this.params[i];
            query += this.strings[i];
            let done = false;
            const acceptParam = (param, name) => {
                if (param instanceof CypherQuery) {
                    const [subQuery, subParams] = param.export(name);
                    query += subQuery;
                    params = Object.assign({}, params, subParams);
                }
                else if (Array.isArray(param)) {
                    for (let j = 0; j < param.length; ++j) {
                        acceptParam(param[j], `${name}_${j}`);
                    }
                }
                else if (param instanceof CypherRawText) {
                    query += `${param.text}`;
                }
                else if (param !== undefined) {
                    query += `{${name}}`;
                    params[name] = param;
                }
            };
            acceptParam(param, name);
        }
        return [query, params];
    }
    run(config = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { driver, parseIntegers, rawResults } = Object.assign({}, this.config, config);
            const session = driver.session();
            const [query, params] = this.export();
            const result = yield session.run(query, params);
            if (rawResults) {
                return result;
            }
            let data = normalizeObjects(result.records);
            if (parseIntegers) {
                data = normalizeInts(data);
            }
            session.close();
            return data;
        });
    }
}
exports.CypherQuery = CypherQuery;
function normalizeObjects(record) {
    if (!(record instanceof Object)) {
        return record;
    }
    let normalized = record;
    if (record.toObject !== undefined) {
        normalized = record.toObject();
    }
    if (record instanceof neo4j_driver_1.default.types.Node) {
        normalized = record.properties;
    }
    if (normalized instanceof Array) {
        normalized = normalized.map(item => normalizeObjects(item));
    }
    else if (normalized instanceof Object) {
        for (let key in normalized) {
            normalized[key] = normalizeObjects(normalized[key]);
        }
    }
    return normalized;
}
function normalizeInts(record) {
    let normalized = record;
    if (neo4j_driver_1.default.isInt(record)) {
        const i = neo4j_driver_1.default.integer;
        normalized = i.inSafeRange(record)
            ? i.toNumber(record)
            : i.toString(record);
    }
    else if (record instanceof Array) {
        normalized = record.map(item => normalizeInts(item));
    }
    else if (record instanceof Object) {
        for (let key in record) {
            normalized[key] = normalizeInts(record[key]);
        }
    }
    return normalized;
}
//# sourceMappingURL=index.js.map