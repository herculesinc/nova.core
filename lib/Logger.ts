// IMPORTS
// =================================================================================================
import { Logger, TraceSource, TraceCommand } from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export const logger: Logger = {

    debug(message: string)  { console.debug(message); },
    info(message: string)   { console.info(message); },
    warn(message: string)   { console.warn(message); },
    error(error: Error)     { console.error(error); },

    trace(source: TraceSource, command: string | TraceCommand, duration: number, success: boolean) {

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
}