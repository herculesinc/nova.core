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
            let cacheSpy: any;

            beforeEach(async () => {
                cache = new MockCache();
                cacheSpy = sinon.spy(clearCache);

                async function action(this: Context, inputs: any) {
                    this.defer(cacheSpy, undefined);
                    this.defer(cacheSpy, ['a']);
                    this.defer(cacheSpy, ['a']);
                }

                operation = new nova.Operation({...config, actions: [action]}, {cache}, new MockLogger());

                await operation.execute(undefined);
            });

            afterEach(() => {
                operation = cache = cacheSpy = undefined;
            });

            it('should be called once', () => {
                expect(cacheSpy.called).to.be.true;
                expect(cacheSpy.callCount).to.equal(1);
            });
            it('should be called with correct arguments', () => {
                expect(cacheSpy.firstCall.calledWithExactly(['a'])).to.be.true;
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

            beforeEach(async () => {
                dispatcher = new MockDispatcher();
                dispatchSpy = sinon.spy(dispatch);

                async function action(this: Context, inputs: any) {
                    this.defer(dispatchSpy, task1);
                    this.defer(dispatchSpy, [task1]);
                    this.defer(dispatchSpy, [task1, task2]);
                }

                operation = new nova.Operation({...config, actions: [action]}, {dispatcher}, new MockLogger());

                await operation.execute(undefined);
            });

            afterEach(() => {
                operation = dispatcher = dispatchSpy = undefined;
            });

            it('should be called once', () => {
                expect(dispatchSpy.called).to.be.true;
                expect(dispatchSpy.callCount).to.equal(1);
            });
            it('should be called with correct arguments', () => {
                expect(dispatchSpy.firstCall.calledWithExactly([task1, task2])).to.be.true;
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
            let notifySpy: any;

            beforeEach(async () => {
                notifier = new MockNotifier();
                notifySpy = sinon.spy(notify);

                async function action(this: Context, inputs: any) {
                    this.defer(notifySpy, notice2);
                    this.defer(notifySpy, undefined);
                    this.defer(notifySpy, [notice1, notice2]);
                }

                operation = new nova.Operation({...config, actions: [action]}, {notifier}, new MockLogger());

                await operation.execute(undefined);
            });

            afterEach(() => {
                operation = notifier = notifySpy = undefined;
            });

            it('should be called once', () => {
                expect(notifySpy.called).to.be.true;
                expect(notifySpy.callCount).to.equal(1);
            });
            it('should be called with correct arguments', () => {
                expect(notifySpy.firstCall.calledWithExactly([notice1, notice2])).to.be.true;
            });
        });
    });
});
