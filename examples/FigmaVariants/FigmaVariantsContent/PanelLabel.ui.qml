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

Item {
    id: panelLabel
    width: 390
    height: 34
    state: "state_state_active"
    property alias panelLabelTextText: panelLabelText.text
    property alias panelLabelNumberText: panelLabelNumber.text

    Rectangle {
        id: panelLabelBottomLine
        x: 0
        y: 32
        width: 390
        height: 2
        color: "#dcdada"
    }

    Rectangle {
        id: panelLabelTopLine
        x: 0
        y: 0
        width: 48
        height: 2
        color: "#33c2ff"
    }

    Text {
        id: panelLabelNumber
        x: 0
        y: 1
        width: 58
        height: 27
        color: "#33c2ff"
        text: qsTr("01")
        font.pixelSize: 24
        horizontalAlignment: Text.AlignLeft
        verticalAlignment: Text.AlignTop
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }

    Text {
        id: panelLabelText
        x: 49
        y: 10
        width: 215
        height: 12
        color: "#33c2ff"
        text: qsTr("textLabel_thing")
        font.pixelSize: 14
        horizontalAlignment: Text.AlignLeft
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
                target: panelLabelBottomLine
                visible: false
            }

            PropertyChanges {
                target: panelLabelTopLine
                color: "#dcdada"
            }

            PropertyChanges {
                target: panelLabelText
                color: "#dcdada"
            }

            PropertyChanges {
                target: panelLabelNumber
                color: "#dcdada"
            }
        }
    ]
}
