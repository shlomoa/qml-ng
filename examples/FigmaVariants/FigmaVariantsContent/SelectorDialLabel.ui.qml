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
    id: selectorDialLabel
    width: 76
    height: 76
    state: "state_state_selected"
    property alias aText: a.text
    property alias eText: e.text
    property alias bText: b.text
    property alias lText: l.text
    property alias l1Text: l1.text

    SvgPathItem {
        id: labelBackground
        x: 7
        y: 26
        width: 63
        height: 23
        strokeWidth: 1
        path: "M 60.31188201904297 4.6698479652404785 C 62.405426025390625 5.375090777873993 63.42517787218094 7.701510906219482 62.6263313293457 9.76115608215332 L 58.4076042175293 20.6381893157959 C 57.60875761508942 22.697834730148315 55.29410123825073 23.708060920238495 53.191688537597656 23.029712677001953 C 39.115272521972656 18.487925052642822 23.861854553222656 18.547725200653076 9.821481704711914 23.199750900268555 C 7.72445273399353 23.894563853740692 5.401946604251862 22.90251398086548 4.586974620819092 20.84919548034668 L 0.2830894887447357 10.005575180053711 C -0.5318823754787445 7.95225715637207 0.46959567070007324 5.617915153503418 2.5575456619262695 4.896278381347656 C 21.21897792816162 -1.5534815788269043 41.60045051574707 -1.6333880424499512 60.31188201904297 4.6698479652404785 Z"
        strokeColor: "#33c2ff"
        fillColor: "#4d33c2ff"
    }

    Item {
        id: labelArcGroup
        x: 16
        y: 28
        width: 42
        height: 14
        Text {
            id: l
            x: 1
            y: 2
            width: 5
            height: 12
            color: "#dcdada"
            text: qsTr("L")
            font.pixelSize: 14
            horizontalAlignment: Text.AlignLeft
            verticalAlignment: Text.AlignTop
            wrapMode: Text.Wrap
            font.family: "Abel"
            font.weight: Font.Normal
            rotation: -12.403
        }

        Text {
            id: a
            x: 9
            y: 0
            width: 6
            height: 12
            color: "#dcdada"
            text: qsTr("A")
            font.pixelSize: 14
            horizontalAlignment: Text.AlignLeft
            verticalAlignment: Text.AlignTop
            wrapMode: Text.Wrap
            font.family: "Abel"
            font.weight: Font.Normal
            rotation: -6.907
        }

        Text {
            id: b
            x: 18
            y: 0
            width: 7
            height: 12
            color: "#dcdada"
            text: qsTr("B")
            font.pixelSize: 14
            horizontalAlignment: Text.AlignLeft
            verticalAlignment: Text.AlignTop
            wrapMode: Text.Wrap
            font.family: "Abel"
            font.weight: Font.Normal
            rotation: -0.955
        }

        Text {
            id: e
            x: 27
            y: 0
            width: 7
            height: 12
            color: "#dcdada"
            text: qsTr("E")
            font.pixelSize: 14
            horizontalAlignment: Text.AlignLeft
            verticalAlignment: Text.AlignTop
            wrapMode: Text.Wrap
            font.family: "Abel"
            font.weight: Font.Normal
            rotation: 5.234
        }

        Text {
            id: l1
            x: 37
            y: 1
            width: 5
            height: 12
            color: "#dcdada"
            text: qsTr("L")
            font.pixelSize: 14
            horizontalAlignment: Text.AlignLeft
            verticalAlignment: Text.AlignTop
            wrapMode: Text.Wrap
            font.family: "Abel"
            font.weight: Font.Normal
            rotation: 10.968
        }
    }
    states: [
        State {
            name: "state_state_selected"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_selected"

            PropertyChanges {
                target: labelBackground
                strokeColor: "#767676"
                fillColor: "#4f4f4f"
            }
        }
    ]
}
