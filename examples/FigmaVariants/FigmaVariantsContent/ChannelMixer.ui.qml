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
    id: channelMixer
    width: 604
    height: 392

    ViewPanel {
        id: viewPanel
        x: 0
        y: 0
        width: 604
        height: 392
        state: "state_state_normal"
    }

    TabButton {
        id: tabButton
        x: 6
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Mix Group 1"
        state: "state_state_checked"
    }

    TabButton {
        id: tabButton1
        x: 87
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Mix Group 2"
        state: "state_state_normal"
    }

    TabButton {
        id: tabButton2
        x: 168
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Mix Group 3"
        state: "state_state_normal"
    }

    TabButton {
        id: tabButton3
        x: 249
        y: 5
        width: 76
        height: 22
        tabButtonLabelText: "Mix Group 4"
        state: "state_state_normal"
    }

    Slider {
        id: slider
        x: 22
        y: 121
        width: 65
        height: 149
        sliderLabelText: "Left"
        state: "state_state_active"
    }

    Slider {
        id: slider1
        x: 103
        y: 121
        width: 65
        height: 149
        sliderLabelText: "Right"
        state: "state_state_active"
    }

    Slider {
        id: slider2
        x: 184
        y: 121
        width: 65
        height: 149
        sliderLabelText: "High"
        state: "state_state_normal"
    }

    Slider {
        id: slider3
        x: 265
        y: 121
        width: 65
        height: 149
        sliderLabelText: "Mid"
        state: "state_state_normal"
    }

    Slider {
        id: slider4
        x: 346
        y: 121
        width: 65
        height: 149
        sliderLabelText: "Low"
        state: "state_state_warning"
    }

    MiniButtonGrid {
        id: miniButtonGrid
        x: 440
        y: 121
        width: 146
        height: 146
    }

    PanelLabel {
        id: panelLabel
        x: 22
        y: 57
        width: 390
        height: 34
        panelLabelNumberText: "03"
        panelLabelTextText: "Channel Mixer"
        state: "state_state_normal"
    }

    PushButton {
        id: pushButton
        x: 8
        y: 354
        width: 110
        height: 29
        buttonLabelText: "LIVE"
        state: "state_state_normal"
    }

    PushButton {
        id: pushButton1
        x: 133
        y: 354
        width: 110
        height: 29
        buttonLabelText: "PREVIEW"
        state: "state_state_pressed"
    }
}
