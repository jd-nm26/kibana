/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
  GetLogEntryRateSuccessResponsePayload,
} from '../../../../common/http_api/log_analysis';
import { throwErrors } from '../../../../common/runtime_types';
import { NoLogAnalysisResultsIndexError } from '../../../lib/log_analysis';

const anyObject = schema.object({}, { unknowns: 'allow' });

export const initGetLogEntryRateRoute = ({ framework, logEntryRateAnalysis }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
      validate: {
        // short-circuit forced @kbn/config-schema validation so we can do io-ts validation
        body: anyObject,
      },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          getLogEntryRateRequestPayloadRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const logEntryRateBuckets = await logEntryRateAnalysis.getLogEntryRateBuckets(
          requestContext,
          request,
          payload.data.sourceId,
          payload.data.timeRange.startTime,
          payload.data.timeRange.endTime,
          payload.data.bucketDuration
        );

        return response.ok({
          body: getLogEntryRateSuccessReponsePayloadRT.encode({
            data: {
              bucketDuration: payload.data.bucketDuration,
              histogramBuckets: logEntryRateBuckets,
              totalNumberOfLogEntries: getTotalNumberOfLogEntries(logEntryRateBuckets),
            },
          }),
        });
      } catch (e) {
        const { statusCode = 500, message = 'Unknown error occurred' } = e;
        if (e instanceof NoLogAnalysisResultsIndexError) {
          return response.notFound({ body: { message } });
        }
        return response.customError({
          statusCode,
          body: { message },
        });
      }
    }
  );
};

const getTotalNumberOfLogEntries = (
  logEntryRateBuckets: GetLogEntryRateSuccessResponsePayload['data']['histogramBuckets']
) => {
  return logEntryRateBuckets.reduce((sumNumberOfLogEntries, bucket) => {
    const sumPartitions = bucket.partitions.reduce((partitionsTotal, partition) => {
      return (partitionsTotal += partition.numberOfLogEntries);
    }, 0);
    return (sumNumberOfLogEntries += sumPartitions);
  }, 0);
};
