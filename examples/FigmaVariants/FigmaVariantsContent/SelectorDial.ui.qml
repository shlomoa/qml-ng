/****************************************************************************
**
** Copyright (C) 2022 The Qt Company Ltd.
** Contact: https://www.qt.io/licensing/
**
** This file is part of Qt Quick Studio Components.
**
** $QT_BEGIN_LICENSE:GPL$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see https://www.qt.io/terms-conditions. For further
** information use the contact form at https://www.qt.io/contact-us.
**
** GNU General Public License Usage
** Alternatively, this file may be used under the terms of the GNU
** General Public License version 3 or (at your option) any later version
** approved by the KDE Free Qt Foundation. The licenses are as published by
** the Free Software Foundation and appearing in the file LICENSE.GPL3
** included in the packaging of this file. Please review the following
** information to ensure the GNU General Public License requirements will
** be met: https://www.gnu.org/licenses/gpl-3.0.html.
**
** $QT_END_LICENSE$
**
****************************************************************************/

import QtQuick 2.8
import QtQuick.Studio.Components 1.0

Item {
    id: selectorDial
    width: 129
    height: 129
    state: "state_state_active"
    property alias selectorDialLabelText: selectorDialLabel.text

    Image {
        id: selectorDialGroove
        x: 0
        y: 0
        source: "assets/selectorDialGroove_state_state_active.png"
    }

    Image {
        id: selectorDialTrack
        x: 0
        y: 0
        source: "assets/selectorDialTrack_state_state_active.png"
    }

    Image {
        id: selectorDialBackground
        x: 12
        y: 12
        source: "assets/selectorDialBackground_state_state_active.png"
    }

    SvgPathItem {
        id: selectorDialIcon
        x: 46
        y: 40
        width: 35
        height: 41
        strokeWidth: 1
        path: "M 35 0 L 35 23.43000999512052 C 34.999561671405296 26.502521039574283 34.196855227152504 29.521215350657602 32.67194641960992 32.18498502911883 C 31.14703761206733 34.84875470758005 28.9532290564643 37.06448841382597 26.309354570176865 38.611165014680225 C 23.66548008388943 40.15784161553448 20.663953655295902 40.98139691955998 17.604174613952637 40.99968717561728 C 14.544395572609371 41.01797743167459 11.5333182281918 40.23036240736529 8.871293200386894 38.715402567921224 C 6.209268172581989 37.20044272847716 3.989346888330248 35.011096131323384 2.4329634507497153 32.36574538493204 C 0.8765800131691828 29.720394638540693 0.03813785059416356 26.711508675290474 0.0012706243271370314 23.63922061131189 C -0.0355966019398895 20.56693254733331 0.7303998205396864 17.53863331736815 2.2228525744544134 14.856393034952402 C 3.7153053283691406 12.174152752536656 5.8820456928677025 9.931727608418537 8.506944444444445 8.35279832491808 L 21.38888888888889 0.8844827786271552 L 21.38888888888889 6.292910281349381 L 35 0 Z M 17.5 13.667505830486972 C 14.921506312158373 13.667505830486975 12.448621127340529 14.696052383823528 10.625350740220812 16.526877100710195 C 8.802080353101095 18.357701817596862 7.7777777777777795 20.8408328717569 7.777777777777778 23.43000999512052 C 7.7777777777777795 26.019187118484144 8.802080353101095 28.50231817264418 10.625350740220812 30.333142889530848 C 12.448621127340529 32.163967606417515 14.921506312158373 33.192514159754076 17.5 33.192514159754076 C 20.07849368784163 33.192514159754076 22.55137887265947 32.163967606417515 24.374649259779186 30.333142889530848 C 26.197919646898903 28.50231817264418 27.22222222222223 26.019187118484144 27.22222222222222 23.43000999512052 C 27.22222222222223 20.8408328717569 26.197919646898903 18.357701817596862 24.374649259779186 16.526877100710195 C 22.55137887265947 14.696052383823528 20.07849368784163 13.667505830486975 17.5 13.667505830486972 L 17.5 13.667505830486972 Z"
        strokeColor: "transparent"
        rotation: 11.585
        fillColor: "#33c2ff"
    }

    Text {
        id: selectorDialLabel
        x: 19
        y: 127
        width: 90
        height: 29
        color: "#ffffff"
        text: qsTr("LABEL")
        font.pixelSize: 14
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }
    states: [
        State {
            name: "state_state_active"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_active"

            PropertyChanges {
                target: selectorDialGroove
                source: "assets/selectorDialGroove_state_state_normal.png"
            }

            PropertyChanges {
                target: selectorDialIcon
                fillColor: "#dcdada"
            }

            PropertyChanges {
                target: selectorDialBackground
                source: "assets/selectorDialBackground_state_state_normal.png"
            }

            PropertyChanges {
                target: selectorDialTrack
                source: "assets/selectorDialTrack_state_state_normal.png"
            }
        }
    ]
}
