// IMPORTS
// =================================================================================================
import { Logger, TraceSource, TraceCommand } from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockLogger implements Logger {
    debug(message: string) {}
    info(message: string) {}
    warn(message: string) {}
    error(error: Error) {}
    trace(source: TraceSource, command: string | TraceCommand, duration: number, success: boolean) {}
}
