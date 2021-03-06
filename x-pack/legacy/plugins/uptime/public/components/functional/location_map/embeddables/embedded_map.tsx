/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useContext, useRef } from 'react';
import uuid from 'uuid';
import styled from 'styled-components';
import { npStart } from 'ui/new_platform';

import { ViewMode } from '../../../../../../../../../src/plugins/embeddable/public';
import * as i18n from './translations';
import { MapEmbeddable, MapEmbeddableInput } from '../../../../../../maps/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../../../../plugins/maps/public';
import { Location } from '../../../../../common/runtime_types';

import { getLayerList } from './map_config';
import { UptimeThemeContext } from '../../../../contexts';

export interface EmbeddedMapProps {
  upPoints: LocationPoint[];
  downPoints: LocationPoint[];
}

export type LocationPoint = Required<Location>;

const EmbeddedPanel = styled.div`
  z-index: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  .embPanel__content {
    display: flex;
    flex: 1 1 100%;
    z-index: 1;
    min-height: 0; // Absolute must for Firefox to scroll contents
  }
  &&& .mapboxgl-canvas {
    animation: none !important;
  }
`;

export const EmbeddedMap = React.memo(({ upPoints, downPoints }: EmbeddedMapProps) => {
  const { colors } = useContext(UptimeThemeContext);
  const [embeddable, setEmbeddable] = useState<MapEmbeddable>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const factory = npStart.plugins.embeddable.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input: MapEmbeddableInput = {
    id: uuid.v4(),
    filters: [],
    hidePanelTitles: true,
    refreshConfig: {
      value: 0,
      pause: false,
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    hideFilterActions: true,
    // Zoom Lat/Lon values are set to make sure map is in center in the panel
    // It wil also omit Greenland/Antarctica etc
    mapCenter: {
      lon: 11,
      lat: 20,
      zoom: 0,
    },
    disableInteractive: true,
    disableTooltipControl: true,
    hideToolbarOverlay: true,
    hideLayerControl: true,
    hideViewControl: true,
  };

  useEffect(() => {
    async function setupEmbeddable() {
      const mapState = {
        layerList: getLayerList(upPoints, downPoints, colors),
        title: i18n.MAP_TITLE,
      };
      // @ts-ignore
      const embeddableObject = await factory.createFromState(mapState, input, undefined);

      setEmbeddable(embeddableObject);
    }
    setupEmbeddable();

    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update map layers based on points
  useEffect(() => {
    if (embeddable) {
      embeddable.setLayerList(getLayerList(upPoints, downPoints, colors));
    }
  }, [upPoints, downPoints, embeddable, colors]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <EmbeddedPanel>
      <div
        data-test-subj="xpack.uptime.locationMap.embeddedPanel"
        className="embPanel__content"
        ref={embeddableRoot}
      />
    </EmbeddedPanel>
  );
});

EmbeddedMap.displayName = 'EmbeddedMap';
