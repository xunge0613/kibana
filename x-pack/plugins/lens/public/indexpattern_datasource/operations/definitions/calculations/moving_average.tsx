/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { useState } from 'react';
import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { EuiFieldNumber } from '@elastic/eui';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import {
  buildLabelFunction,
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
} from './utils';
import { updateColumnParam } from '../../layer_helpers';
import { useDebounceWithOptions } from '../helpers';
import { adjustTimeScaleOnOtherColumnChange } from '../../time_scale_utils';
import type { OperationDefinition, ParamEditorProps } from '..';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.movingAverageOf', {
    defaultMessage: 'Moving average of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type MovingAverageIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'moving_average';
    params: {
      window: number;
    };
  };

export const movingAverageOperation: OperationDefinition<
  MovingAverageIndexPatternColumn,
  'fullReference'
> = {
  type: 'moving_average',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.movingAverage', {
    defaultMessage: 'Moving average',
  }),
  input: 'fullReference',
  selectionStyle: 'full',
  requiredReferences: [
    {
      input: ['field'],
      validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
    },
  ],
  getPossibleOperation: (indexPattern) => {
    if (hasDateField(indexPattern)) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    return ofName(columns[column.references[0]]?.label, column.timeScale);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'moving_average', {
      window: [(layer.columns[columnId] as MovingAverageIndexPatternColumn).params.window],
    });
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const metric = layer.columns[referenceIds[0]];
    return {
      label: ofName(metric?.label, previousColumn?.timeScale),
      dataType: 'number',
      operationType: 'moving_average',
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      timeScale: previousColumn?.timeScale,
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params &&
        previousColumn.params.format
          ? { format: previousColumn.params.format, window: 5 }
          : { window: 5 },
    };
  },
  paramEditor: MovingAverageParamEditor,
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  onOtherColumnChanged: adjustTimeScaleOnOtherColumnChange,
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.movingAverage', {
        defaultMessage: 'Moving average',
      })
    );
  },
  getDisabledStatus(indexPattern, layer) {
    return checkForDateHistogram(
      layer,
      i18n.translate('xpack.lens.indexPattern.movingAverage', {
        defaultMessage: 'Moving average',
      })
    )?.join(', ');
  },
  timeScalingMode: 'optional',
};

function isValidNumber(input: string) {
  if (input === '') return false;
  try {
    const val = parseFloat(input);
    if (isNaN(val)) return false;
    if (val < 1) return false;
    if (val.toString().includes('.')) return false;
  } catch (e) {
    return false;
  }
  return true;
}

function MovingAverageParamEditor({
  layer,
  updateLayer,
  currentColumn,
  columnId,
}: ParamEditorProps<MovingAverageIndexPatternColumn>) {
  const [inputValue, setInputValue] = useState(String(currentColumn.params.window));

  useDebounceWithOptions(
    () => {
      if (!isValidNumber(inputValue)) return;
      const inputNumber = parseInt(inputValue, 10);
      updateLayer(
        updateColumnParam({
          layer,
          columnId,
          paramName: 'window',
          value: inputNumber,
        })
      );
    },
    { skipFirstRender: true },
    256,
    [inputValue]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.movingAverage.window', {
        defaultMessage: 'Window size',
      })}
      display="columnCompressed"
      fullWidth
      isInvalid={!isValidNumber(inputValue)}
    >
      <EuiFieldNumber
        compressed
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
        min={1}
        step={1}
        isInvalid={!isValidNumber(inputValue)}
      />
    </EuiFormRow>
  );
}
