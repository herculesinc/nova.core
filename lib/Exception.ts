// IMPORTS
// ================================================================================================
import { ExceptionOptions } from '@nova/core';
import { HttpStatusCode, HttpCodeNames } from './util';

// BASE EXCEPTION CLASS
// ================================================================================================
export class Exception extends Error {

    readonly name       : string;
    readonly status     : number;
    readonly code?      : number;
    readonly cause?     : Error;

    headers?            : { [header: string]: string; };
    details?            : any;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(options: ExceptionOptions)
    constructor(message: string, status?: number)
    constructor(messageOrOptions: string | ExceptionOptions, status?: number) {
        if (typeof messageOrOptions === 'string') {
            super(messageOrOptions);
            this.status = 
                (typeof status !== 'number' || status < 400 || status > 599)
                ? HttpStatusCode.InternalServerError : status;
            Error.captureStackTrace(this, this.constructor);
            this.name = HttpCodeNames.get(this.status) || 'Unknown Error';
        }
        else {
            super(messageOrOptions.message);
            status = messageOrOptions.status;
            this.status = (typeof status !== 'number' || status < 400 || status > 599)
                ? HttpStatusCode.InternalServerError : status;
            this.code = messageOrOptions.code;
            this.cause = messageOrOptions.cause;

            if (this.cause) {
                this.message = this.message 
                    ? `${this.message}: ${this.cause.message}` 
                    : this.cause.message;
            }

            Error.captureStackTrace(this, messageOrOptions.stackStart || this.constructor);
            this.name = messageOrOptions.name || HttpCodeNames.get(this.status) || 'Unknown Error';
        }
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    get isClientError(): boolean {
        return (this.status >= 400 && this.status < 500);
    }

    get isServerError(): boolean {
        return (this.status >= 500 && this.status < 600);
    }

    toJSON(): any {
        return {
            name    : this.name,
            code    : this.code,
            message : this.message,
            details : this.details
        };
    }
}