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
    id: tabButton
    width: 76
    height: 22
    state: "state_state_pressed"
    property alias tabButtonLabelText: tabButtonLabel.text

    Rectangle {
        id: tabButtonBackground
        x: 0
        y: 0
        width: 76
        height: 22
        color: "#4d33c2ff"
        border.color: "#33c2ff"
        border.width: 1
    }

    Text {
        id: tabButtonLabel
        x: 0
        y: 0
        width: 77
        height: 22
        color: "#dcdada"
        text: qsTr("Tab Header")
        font.pixelSize: 14
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }
    states: [
        State {
            name: "state_state_pressed"
        },
        State {
            name: "state_state_checked"
            extend: "state_state_pressed"

            PropertyChanges {
                target: tabButtonBackground
                color: "#33c2ff"
            }

            PropertyChanges {
                target: tabButtonLabel
                color: "#111112"
            }
        },
        State {
            name: "state_state_normal"
            extend: "state_state_pressed"

            PropertyChanges {
                target: tabButtonBackground
                color: "transparent"
            }

            PropertyChanges {
                target: tabButtonLabel
                color: "#33c2ff"
            }
        }
    ]
}
