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
class CypherHelper {
    constructor(config) {
        this.config = {
            driver: null,
            parseIntegers: false
        };
        this.query = (strings, ...params) => {
            return new CypherQuery(this.config, strings, params);
        };
        this.config = Object.assign({ parseIntegers: false }, config);
    }
}
exports.default = CypherHelper;
class CypherQuery {
    constructor(config, strings, params = []) {
        this.config = config;
        this.strings = strings;
        this.params = params;
    }
    export(prefix = 'p') {
        let query = '';
        let params = {};
        for (let i = 0, l = this.strings.length; i < l; i++) {
            const name = `${prefix}_${i}`;
            const param = this.params[i];
            query += this.strings[i];
            if (param instanceof CypherQuery) {
                const [subQuery, subParams] = param.export(name);
                query += subQuery;
                params = Object.assign({}, params, subParams);
            }
            else if (param !== undefined) {
                query += `{${name}}`;
                params[name] = param;
            }
        }
        return [
            query,
            params,
        ];
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const session = this.config.driver.session();
            const [query, params] = this.export();
            const result = yield session.run(query, params);
            let data = result.records.map(record => record.toObject());
            if (this.config.parseIntegers) {
                data = normalizeInts(data);
            }
            session.close();
            return data;
        });
    }
}
exports.CypherQuery = CypherQuery;
function normalizeInts(record) {
    let normalized = record;
    if (neo4j_driver_1.default.isInt(record)) {
        normalized = neo4j_driver_1.default.integer.toNumber(record);
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