"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// =================================================================================================
exports.logger = {
    debug(message) { console.debug(message); },
    info(message) { console.info(message); },
    warn(message) { console.warn(message); },
    error(error) { console.error(error); },
    trace(source, command, duration, success) {
        if (typeof command !== 'string') {
            command = command.name;
        }
        if (success) {
            console.info(`[${source.name}]: executed [${command}] in ${duration} ms`);
        }
        else {
            console.info(`[${source.name}]: failed to execute [${command}] in ${duration} ms`);
        }
    }
};
//# sourceMappingURL=Logger.js.map