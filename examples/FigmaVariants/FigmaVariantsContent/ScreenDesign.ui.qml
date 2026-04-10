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

Rectangle {
    id: screenDesign
    width: 1920
    height: 1080
    color: "#ffffff"

    ScreenTemplate {
        id: screenTemplate
        x: 0
        y: 0
        width: 1920
        height: 1080
    }

    LargeButton {
        id: largeButton
        x: 36
        y: 64
        width: 100
        height: 106
        state: "state_state_active"
    }

    LargeButton {
        id: largeButton1
        x: 36
        y: 198
        width: 100
        height: 106
        state: "state_state_normal"
    }

    LargeButton {
        id: largeButton2
        x: 36
        y: 466
        width: 100
        height: 106
        state: "state_state_normal"
    }

    LargeButton {
        id: largeButton3
        x: 36
        y: 332
        width: 100
        height: 106
        state: "state_state_normal"
    }

    LargeButton {
        id: largeButton4
        x: 36
        y: 600
        width: 100
        height: 106
        state: "state_state_normal"
    }

    LFOMix {
        id: lFOMix
        x: 1116
        y: 117
        width: 604
        height: 392
    }

    Sequencer {
        id: sequencer
        x: 324
        y: 117
        width: 604
        height: 392
    }

    MiniButton {
        id: miniButton
        x: 36
        y: 799
        width: 42
        height: 42
        state: "state_state_checked"
    }

    MiniButton {
        id: miniButton1
        x: 36
        y: 857
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton2
        x: 36
        y: 915
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton3
        x: 36
        y: 973
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton4
        x: 94
        y: 799
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton5
        x: 94
        y: 857
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton6
        x: 94
        y: 915
        width: 42
        height: 42
        state: "state_state_normal"
    }

    MiniButton {
        id: miniButton7
        x: 94
        y: 973
        width: 42
        height: 42
        state: "state_state_normal"
    }

    ChannelMixer {
        id: channelMixer
        x: 1116
        y: 569
        width: 604
        height: 392
    }

    Equalizer {
        id: equalizer
        x: 324
        y: 574
        width: 604
        height: 392
    }
}
