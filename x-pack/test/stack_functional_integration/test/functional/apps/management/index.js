/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile }) {
  describe('settings / management app', function() {
    loadTestFile(require.resolve('./_get_version_info'));
    loadTestFile(require.resolve('./_index_pattern_create_delete'));
  });
}