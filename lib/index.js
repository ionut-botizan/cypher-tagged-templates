"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class CypherHelper {
    constructor(driver) {
        this.driver = driver;
        this.query = (strings, ...params) => {
            return new Query(this.driver, strings, params);
        };
    }
}
exports.default = CypherHelper;
class Query {
    constructor(driver, strings, params = []) {
        this.driver = driver;
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
            if (param instanceof Query) {
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
            const session = this.driver.session();
            const [query, params] = this.export();
            return session.run(query, params).then(result => {
                session.close();
                return result;
            });
        });
    }
}
exports.Query = Query;
//# sourceMappingURL=index.js.map