// IMPORTS
// =================================================================================================
import { Cache } from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockCache implements Cache {

    get(keyOrKeys: string | string[]): Promise<any> {
        // console.log(`Cache::get{${keyOrKeys}}`)
        return Promise.resolve();
    }

    set(key: string, value: any, expires?: number) {
        // console.log(`Cache::clear{${key}, ${value}, ${expires}}`);
    }

    clear(keyOrKeys: string | string[]) {
        // console.log(`Cache::clear{${keyOrKeys}}`);
    }
}
