// IMPORTS
// =================================================================================================
import {Logger} from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockLogger implements Logger {
    debug(message: string) {}
    info(message: string) {}
    warn(message: string) {}
    error(error: Error) {}
}
