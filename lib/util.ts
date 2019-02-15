// HTTP CODES
// ================================================================================================
export const enum HttpStatusCode {
    OK                  = 200,
    Created             = 201,
    Accepted            = 202,
    NoContent           = 204,
    BadRequest          = 400, 
    Unauthorized        = 401,
    InvalidInputs       = 402,
    Forbidden           = 403,
    NotFound            = 404,
    NotAllowed          = 405,
    NotAcceptable       = 406,
    PayloadTooLarge     = 413,
    UnsupportedContent  = 415,
    NotReady            = 425,
    TooManyRequests     = 429,
    InternalServerError = 500,
    NotImplemented      = 501,
    ServiceUnavailable  = 503
}

export const HttpCodeNames = new Map([
    [ 200, 'OK' ],
    [ 201, 'Created' ],
    [ 202, 'Accepted' ],
    [ 204, 'No Content' ],
    [ 400, 'Bad Request' ],
    [ 401, 'Unauthorized' ],
    [ 402, 'Invalid Inputs' ],
    [ 403, 'Forbidden' ],
    [ 404, 'Not Found' ],
    [ 405, 'Method Not Allowed' ],
    [ 406, 'Not Acceptable' ],
    [ 413, 'Payload Too Large' ],
    [ 415, 'Unsupported Media Type' ],
    [ 425, 'Not Ready' ],
    [ 429, 'Too Many Requests' ],
    [ 500, 'Internal Server Error' ],
    [ 501, 'Not Implemented' ],
    [ 503, 'Service Unavailable' ],
]);