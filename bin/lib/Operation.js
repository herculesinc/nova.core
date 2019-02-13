"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// CLASS DEFINITION
// =================================================================================================
class Operation {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config, services) {
        this.id = config.id;
        this.name = config.name;
        this.origin = config.origin;
        this.timestamp = Date.now();
        this.log = config.logger;
        this.dao = services.dao;
        this.cache = services.cache;
        this.notifier = services.notifier;
        this.dispatcher = services.dispatcher;
        this.tasks = [];
        this.notices = new Map();
        this.deferred = [];
        this.sealed = false;
    }
    // PUBLIC PROPERTIES
    // --------------------------------------------------------------------------------------------
    get isSealed() {
        return this.sealed;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    notify(target, notice, immediate = false) {
        if (!notice)
            throw new TypeError('Cannot register notice: notice is undefined');
        if (!this.notifier)
            throw new Error('Cannot register notice: notifier service is undefined');
        if (immediate) {
            this.notifier.send(target, notice);
            return;
        }
        const notices = this.notices.get(target) || [];
        for (let i = 0; i < notices.length; i++) {
            if (!notice[i])
                continue;
            let merged = notice.merge(notices[i]);
            if (merged) {
                notices[i] = null;
                notice = merged;
            }
        }
        notices.push(notice);
        this.notices.set(target, notices);
    }
    dispatch(task, immediate = false) {
        if (!task)
            throw new TypeError('Cannot dispatch task: task is undefined');
        if (!this.dispatcher)
            throw new Error('Cannot dispatch task: dispatcher service is undefined');
        if (immediate) {
            this.dispatcher.send(task);
            return;
        }
        for (let i = 0; i < this.tasks.length; i++) {
            if (!this.tasks[i])
                continue;
            let merged = task.merge(this.tasks[i]);
            if (merged) {
                this.tasks[i] = null;
                task = merged;
            }
        }
        this.tasks.push(task);
    }
    defer(action, inputs) {
        if (!action)
            throw new TypeError('Cannot defer an action: action is undefined');
        if (this.sealed)
            throw new Error('Cannot defer an action: the operation has been sealed');
        if (action.merge) {
            for (let i = 0; i < this.deferred.length; i++) {
                if (!this.deferred[i])
                    continue;
                if (this.deferred[i].action === action) {
                    let mergedInputs = action.merge(inputs, this.deferred[i].inputs);
                    if (mergedInputs) {
                        this.deferred[i].inputs = mergedInputs;
                        return;
                    }
                }
            }
        }
        this.deferred.push({ action: action, inputs: inputs });
    }
    seal() {
        if (this.sealed)
            throw new Error('Cannot seal operation: operation has already been sealed');
        if (this.dao && this.dao.isActive)
            throw new Error('Cannot seal an operation with active DAO');
        this.sealed = true;
    }
    // FLUSHING
    // --------------------------------------------------------------------------------------------
    flushNotices() {
        if (!this.notifier || this.notices.size === 0)
            return Promise.resolve();
        let promises = [];
        for (let [target, notices] of this.notices) {
            promises.push(this.notifier.send(target, notices.filter(NotNull)));
        }
        this.notices.clear();
        return Promise.all(promises);
    }
    flushTasks() {
        if (!this.dispatcher || this.tasks.length === 0)
            return Promise.resolve();
        const tasks = this.tasks.filter(NotNull);
        const promise = this.dispatcher.send(tasks);
        this.tasks.length = 0;
        return promise;
    }
    clearDeferredActions() {
        if (this.deferred.length === 0)
            return [];
        const deferred = this.deferred.filter(NotNull);
        this.deferred.length = 0;
        return deferred;
    }
}
exports.Operation = Operation;
// HELPER FUNCTIONS
// =================================================================================================
function NotNull(element) {
    return (element !== null);
}
//# sourceMappingURL=Operation.js.map