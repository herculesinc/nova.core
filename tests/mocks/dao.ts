// IMPORTS
// =================================================================================================
import {Dao} from '@nova/core';

// CLASS DEFINITION
// =================================================================================================
export class MockDao implements Dao {

    isActive = true;
    isReadOnly = false;

    close(action: 'commit' | 'rollback'): Promise<any> {
        this.isActive = false;
        return Promise.resolve();
    }
}
