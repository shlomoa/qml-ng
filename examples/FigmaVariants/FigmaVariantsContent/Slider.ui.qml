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
    id: slider
    width: 65
    height: 149
    state: "state_state_warning"
    property alias valueLabelText: valueLabel.text
    property alias sliderLabelText: sliderLabel.text

    Rectangle {
        id: sliderBackground
        x: 8
        y: 23
        width: 49
        height: 100
        color: "#66ff3333"
        border.color: "#dcdada"
        border.width: 1
    }

    Rectangle {
        id: sliderFill
        x: 9
        y: 70
        width: 47
        height: 52
        color: "#c03a4d"
    }

    Text {
        id: sliderLabel
        x: 5
        y: 130
        width: 55
        height: 19
        color: "#dcdada"
        text: qsTr("Label")
        font.pixelSize: 14
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }

    Item {
        id: sliderMarkings
        x: 9
        y: 43
        width: 47
        height: 62
        Image {
            id: sliderMarkings_merged_child
            x: 0
            y: 0
            source: "assets/sliderMarkings_merged_child_state_state_warning.png"
        }
    }

    Rectangle {
        id: sliderUnderline
        x: 31
        y: 104
        width: 3
        height: 49
        color: "#c03a4d"
        rotation: -90
    }

    Rectangle {
        id: sliderHandle
        x: 31
        y: 38
        width: 3
        height: 65
        color: "#f5576d"
        rotation: -90
    }

    Item {
        id: sliderValue
        x: 5
        y: 0
        width: 55
        height: 19
        Rectangle {
            id: valueBackground
            x: 18
            y: -18
            width: 19
            height: 55
            color: "#c03a4d"
            rotation: -90
        }

        Text {
            id: valueLabel
            x: 0
            y: 0
            width: 55
            height: 19
            color: "#dcdada"
            text: qsTr("100")
            font.pixelSize: 14
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            wrapMode: Text.Wrap
            font.family: "Abel"
            font.weight: Font.Normal
        }
    }
    states: [
        State {
            name: "state_state_warning"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_warning"

            PropertyChanges {
                target: sliderMarkings_merged_child
                source: "assets/sliderMarkings_merged_child_state_state_normal.png"
            }

            PropertyChanges {
                target: valueBackground
                color: "#4f4f4f"
            }

            PropertyChanges {
                target: sliderFill
                color: "#2e2e2e"
            }

            PropertyChanges {
                target: sliderBackground
                color: "#4f4f4f"
                border.color: "#767676"
            }

            PropertyChanges {
                target: sliderUnderline
                color: "#dcdada"
            }

            PropertyChanges {
                target: sliderHandle
                color: "#dcdada"
            }
        },
        State {
            name: "state_state_active"
            extend: "state_state_warning"

            PropertyChanges {
                target: sliderMarkings_merged_child
                source: "assets/sliderMarkings_merged_child_state_state_active.png"
            }

            PropertyChanges {
                target: valueBackground
                color: "#33c2ff"
            }

            PropertyChanges {
                target: sliderFill
                color: "#0f3a4d"
            }

            PropertyChanges {
                target: valueLabel
                color: "#424242"
            }

            PropertyChanges {
                target: sliderBackground
                color: "#4d33c2ff"
                border.color: "#33c2ff"
            }

            PropertyChanges {
                target: sliderUnderline
                color: "#dcdada"
            }

            PropertyChanges {
                target: sliderHandle
                color: "#33c2ff"
            }
        }
    ]
}

