/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getEntryListMock } from './entry_list.mock';
import { EntryList, entriesList } from './entry_list';

describe('entriesList', () => {
  test('it should validate an entry', () => {
    const payload = { ...getEntryListMock() };
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when operator is "included"', () => {
    const payload = { ...getEntryListMock() };
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate when "operator" is "excluded"', () => {
    const payload = { ...getEntryListMock() };
    payload.operator = 'excluded';
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate when "list" is not expected value', () => {
    const payload: Omit<EntryList, 'list'> & { list: string } = {
      ...getEntryListMock(),
      list: 'someListId',
    };
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "someListId" supplied to "list"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate when "list.id" is empty string', () => {
    const payload: Omit<EntryList, 'list'> & { list: { id: string; type: 'ip' } } = {
      ...getEntryListMock(),
      list: { id: '', type: 'ip' },
    };
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "list,id"']);
    expect(message.schema).toEqual({});
  });

  test('it should not validate when "type" is not "lists"', () => {
    const payload: Omit<EntryList, 'type'> & { type: 'match_any' } = {
      ...getEntryListMock(),
      type: 'match_any',
    };
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "match_any" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EntryList & {
      extraKey?: string;
    } = { ...getEntryListMock() };
    payload.extraKey = 'some extra key';
    const decoded = entriesList.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({ ...getEntryListMock() });
  });
});
