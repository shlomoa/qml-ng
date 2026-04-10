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
    id: viewPanel
    width: 604
    height: 392
    state: "state_state_active"

    Rectangle {
        id: panelBackground
        x: 0
        y: 0
        width: 604
        height: 392
        color: "#2e2e2e"
        border.color: "#33c2ff"
        border.width: 1
    }

    Rectangle {
        id: panelBottomBar
        x: 0
        y: 346
        width: 604
        height: 46
        color: "#38383f"
        border.color: "#33c2ff"
        border.width: 1
    }

    Rectangle {
        id: panelTopBar
        x: 0
        y: 0
        width: 604
        height: 32
        color: "#111112"
        border.color: "#33c2ff"
        border.width: 1
    }
    states: [
        State {
            name: "state_state_active"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_active"

            PropertyChanges {
                target: panelBackground
                border.color: "#767676"
            }

            PropertyChanges {
                target: panelTopBar
                border.color: "#767676"
            }

            PropertyChanges {
                target: panelBottomBar
                border.color: "#767676"
            }
        }
    ]
}
