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
    id: sequencer
    width: 604
    height: 392

    ViewPanel {
        id: viewPanel
        x: 0
        y: 0
        width: 604
        height: 392
        state: "state_state_active"
    }

    TabButton {
        id: tabButton
        x: 5
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Seq 1"
        state: "state_state_checked"
    }

    TabButton {
        id: tabButton1
        x: 86
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Seq 2"
        state: "state_state_normal"
    }

    TabButton {
        id: tabButton2
        x: 167
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Seq 3"
        state: "state_state_normal"
    }

    PushButton {
        id: pushButton
        x: 9
        y: 354
        width: 110
        height: 29
        buttonLabelText: "GROUP A"
        state: "state_state_pressed"
    }

    PushButton {
        id: pushButton1
        x: 129
        y: 354
        width: 110
        height: 29
        buttonLabelText: "GROUP B"
        state: "state_state_normal"
    }

    PushButton {
        id: pushButton2
        x: 249
        y: 354
        width: 110
        height: 29
        buttonLabelText: "GROUP C"
        state: "state_state_normal"
    }

    PushButton {
        id: pushButton3
        x: 369
        y: 354
        width: 110
        height: 29
        buttonLabelText: "NOT SET"
        state: "state_state_blocked"
    }

    PanelLabel {
        id: panelLabel
        x: 21
        y: 57
        width: 390
        height: 34
        panelLabelTextText: "TAP BUTTON SEQUENCER"
        state: "state_state_active"
    }

    TapPad {
        id: tapPad
        x: 21
        y: 121
        width: 390
        height: 140
    }

    Slider {
        id: slider
        x: 437
        y: 121
        width: 65
        height: 149
        sliderLabelText: "Left"
        state: "state_state_normal"
    }

    Slider {
        id: slider1
        x: 519
        y: 121
        width: 65
        height: 149
        sliderLabelText: "Right"
        state: "state_state_active"
    }

    MiniButton {
        id: miniButton
        x: 22
        y: 286
        width: 42
        height: 42
        state: "state_state_checked"
    }

    MiniButton {
        id: miniButton1
        x: 69
        y: 286
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton2
        x: 116
        y: 286
        width: 42
        height: 42
        state: "state_state_normal"
    }
}
