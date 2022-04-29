"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigs = void 0;
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./utils/logger");
function getConfigs(file) {
    if (!fs_1.default.existsSync(file)) {
        logger_1.logger.error(`config file ${file} is not exists.`);
        process.exit(1);
    }
    const content = fs_1.default.readFileSync(file, { encoding: 'utf-8' });
    return toml_1.default.parse(content);
}
exports.getConfigs = getConfigs;
