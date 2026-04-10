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
    id: pushButton
    width: 110
    height: 29
    state: "state_state_blocked"
    property alias buttonLabelText: buttonLabel.text

    Rectangle {
        id: buttonBackground
        x: 0
        y: 0
        width: 110
        height: 29
        color: "transparent"
        border.color: "#767676"
        border.width: 1
    }

    Text {
        id: buttonLabel
        x: 0
        y: 0
        width: 111
        height: 29
        color: "#767676"
        text: qsTr("BUTTON")
        font.pixelSize: 12
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }
    states: [
        State {
            name: "state_state_blocked"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_blocked"

            PropertyChanges {
                target: buttonLabel
                color: "#dedede"
            }

            PropertyChanges {
                target: buttonBackground
                color: "#4f4f4f"
            }
        },
        State {
            name: "state_state_pressed"
            extend: "state_state_blocked"

            PropertyChanges {
                target: buttonLabel
                color: "#424242"
            }

            PropertyChanges {
                target: buttonBackground
                color: "#33c2ff"
            }
        }
    ]
}
