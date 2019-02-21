import { expect } from 'chai';
import * as sinon from 'sinon';

import * as nova from '../index';
import { MockCache, MockDispatcher, MockLogger, MockNotice, MockNotifier, MockTask } from './mocks';
import { Cache, Context, Dispatcher, OperationConfig } from '@nova/core';

const { clearCache, dispatch, notify } = nova.actions;

const config: OperationConfig = {
    id      : 'id',
    name    : 'name',
    origin  : 'origin',
    actions : []
};

describe('NOVA.CORE -> common actions;', () => {
    describe('\'clearCache\' action;', () => {
        describe('\'clearCache.merge()\' method should return correct result;', () => {
            [
                {i1: undefined,  i2: undefined,  res: undefined},
                {i1: undefined,  i2: [],         res: []},
                {i1: [],         i2: undefined,  res: []},
                {i1: [],         i2: [],         res: []},
                {i1: ['a'],      i2: ['a'],      res: ['a']},
                {i1: ['a'],      i2: ['b'],      res: ['a', 'b']},
                {i1: ['a', 'b'], i2: ['b'],      res: ['a', 'b']},
                {i1: ['a'],      i2: ['a', 'b'], res: ['a', 'b']},
            ].forEach(({i1, i2, res}) => {
                it(`for i1=${JSON.stringify(i1)} and i2=${JSON.stringify(i2)}`, () => {
                    expect(clearCache.merge(i1, i2)).to.deep.equal(res);
                });
            });
        });

        describe('action should work correctly in controller;', () => {
            let operation: nova.Operation;
            let cache: Cache;
            let clearCacheActionSpy: any;
            let clearSpy: any;
            let completedSpy: any;

            beforeEach(async () => {
                cache = new MockCache();
                clearCacheActionSpy = sinon.spy(clearCache);
                completedSpy = sinon.stub();
                clearSpy = sinon.spy(cache, 'clear');

                async function action(this: Context, inputs: any) {
                    this.defer(clearCacheActionSpy, undefined);
                    this.defer(clearCacheActionSpy, ['b']);
                    this.defer(clearCacheActionSpy, ['a']);
                    this.defer(clearCacheActionSpy, ['a']);
                    completedSpy();
                }

                operation = new nova.Operation({...config, actions: [action]}, {cache}, new MockLogger());

                await operation.execute(undefined);
            });

            describe('clearCache action', () => {
                it('should be called once', () => {
                    expect(clearCacheActionSpy.called).to.be.true;
                    expect(clearCacheActionSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(clearCacheActionSpy.firstCall.calledWithExactly(['a', 'b'])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(clearCacheActionSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });

            describe('cache.clear() method', () => {
                it('should be called once', () => {
                    expect(clearSpy.called).to.be.true;
                    expect(clearSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(clearSpy.firstCall.calledWithExactly(['a', 'b'])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(clearSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });
        });
    });

    describe('\'dispatch\' action;', () => {
        const task1 = new MockTask('task1');
        const task2 = new MockTask('task2');

        describe('\'dispatch.merge()\' method should return correct result;', () => {
            [
                {i1: undefined,      i2: undefined,      res: undefined},
                {i1: undefined,      i2: task1,          res: task1},
                {i1: task1,          i2: undefined,      res: task1},
                {i1: [],             i2: [],             res: []},
                {i1: [task1],        i2: [],             res: [task1]},
                {i1: [],             i2: [task1],        res: [task1]},
                {i1: [task1],        i2: [task1],        res: [task1]},
                {i1: [task1],        i2: [task2],        res: [task1, task2]},
                {i1: [task1, task2], i2: [task2],        res: [task1, task2]},
                {i1: [task1, task2], i2: [task1, task2], res: [task1, task2]},
            ].forEach(({i1, i2, res}) => {
                it(`for i1=${JSON.stringify(i1)} and i2=${JSON.stringify(i2)}`, () => {
                    expect(dispatch.merge(i1, i2)).to.deep.equal(res);
                });
            });
        });

        describe('action should work correctly in controller;', () => {
            let operation: nova.Operation;
            let dispatcher: Dispatcher;
            let dispatchSpy: any;
            let dispatchActionSpy: any;
            let sendSpy: any;
            let completedSpy: any;

            beforeEach(async () => {
                dispatcher = new MockDispatcher();
                dispatchActionSpy = sinon.spy(dispatch);
                completedSpy = sinon.stub();

                async function action(this: Context, inputs: any) {
                    this.defer(dispatchActionSpy, task1);
                    this.defer(dispatchActionSpy, [task1]);
                    this.defer(dispatchActionSpy, [task1, task2]);
                    completedSpy();
                }

                operation = new nova.Operation({...config, actions: [action]}, {dispatcher}, new MockLogger());

                dispatchSpy = sinon.spy(operation, 'dispatch');
                sendSpy = sinon.spy(dispatcher, 'send');

                await operation.execute(undefined);
            });

            describe('dispatch action', () => {
                it('should be called once', () => {
                    expect(dispatchActionSpy.called).to.be.true;
                    expect(dispatchActionSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(dispatchActionSpy.firstCall.calledWithExactly([task1, task2])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(dispatchActionSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });

            describe('operation.dispatch() method', () => {
                it('should be called once', () => {
                    expect(dispatchSpy.called).to.be.true;
                    expect(dispatchSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(dispatchSpy.firstCall.calledWithExactly([task1, task2])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(dispatchSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });

            describe('dispatcher.send() method', () => {
                it('should be called once', () => {
                    expect(sendSpy.called).to.be.true;
                    expect(sendSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(sendSpy.firstCall.calledWithExactly([task1, task2])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(sendSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });
        });
    });

    describe('\'notify\' action;', () => {
        const notice1 = new MockNotice('notice1');
        const notice2 = new MockNotice('notice2');

        describe('\'notify.merge()\' method should return correct result;', () => {
            [
                {i1: undefined,          i2: undefined,          res: undefined},
                {i1: undefined,          i2: notice1,            res: notice1},
                {i1: notice1,            i2: undefined,          res: notice1},
                {i1: [],                 i2: [],                 res: []},
                {i1: [notice1],          i2: [],                 res: [notice1]},
                {i1: [],                 i2: [notice1],          res: [notice1]},
                {i1: [notice1],          i2: [notice1],          res: [notice1]},
                {i1: [notice1],          i2: [notice2],          res: [notice1, notice2]},
                {i1: [notice1, notice2], i2: [notice2],          res: [notice1, notice2]},
                {i1: [notice1, notice2], i2: [notice1, notice2], res: [notice1, notice2]},
            ].forEach(({i1, i2, res}) => {
                it(`for i1=${JSON.stringify(i1)} and i2=${JSON.stringify(i2)}`, () => {
                    expect(notify.merge(i1, i2)).to.deep.equal(res);
                });
            });
        });

        describe('action should work correctly in controller;', () => {
            let operation: nova.Operation;
            let notifier: MockNotifier;
            let notifyActionSpy: any;
            let notifySpy: any;
            let sendSpy: any;
            let completedSpy: any;

            beforeEach(async () => {
                notifier = new MockNotifier();

                notifyActionSpy = sinon.spy(notify);
                sendSpy = sinon.spy(notifier, 'send');
                completedSpy = sinon.stub();

                async function action(this: Context, inputs: any) {
                    this.defer(notifyActionSpy, notice2);
                    this.defer(notifyActionSpy, undefined);
                    this.defer(notifyActionSpy, [notice1, notice2]);
                    completedSpy();
                }

                operation = new nova.Operation({...config, actions: [action]}, {notifier}, new MockLogger());

                notifySpy = sinon.spy(operation, 'notify');

                await operation.execute(undefined);
            });

            describe('notify action', () => {
                it('should be called once', () => {
                    expect(notifyActionSpy.called).to.be.true;
                    expect(notifyActionSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(notifyActionSpy.firstCall.calledWithExactly([notice1, notice2])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(notifyActionSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });

            describe('operation.notify() method', () => {
                it('should be called once', () => {
                    expect(notifySpy.called).to.be.true;
                    expect(notifySpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(notifySpy.firstCall.calledWithExactly([notice1, notice2])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(notifySpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });

            describe('notifier.send() method', () => {
                it('should be called once', () => {
                    expect(sendSpy.called).to.be.true;
                    expect(sendSpy.callCount).to.equal(1);
                });
                it('should be called with correct arguments', () => {
                    expect(sendSpy.firstCall.calledWithExactly([notice1, notice2])).to.be.true;
                });
                it('should be executed after the action completed', () => {
                    expect(sendSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
                });
            });
        });
    });
});
