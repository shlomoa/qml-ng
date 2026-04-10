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
    id: largeButton
    width: 100
    height: 106
    state: "state_state_normal"
    property alias buttonLabelText: buttonLabel.text

    Rectangle {
        id: buttonUnderline
        x: 9
        y: 95
        width: 3
        height: 20
        color: "#dcdada"
        rotation: -90
    }

    Rectangle {
        id: buttonBackground
        x: 0
        y: 0
        width: 100
        height: 100
        color: "#4f4f4f"
        border.color: "#767676"
        border.width: 1
    }

    Text {
        id: buttonLabel
        x: 0
        y: 62
        width: 101
        height: 38
        color: "#dedede"
        text: qsTr("BUTTON")
        font.pixelSize: 12
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }

    SvgPathItem {
        id: buttonIcon
        x: 28
        y: 20
        width: 44
        height: 40
        strokeWidth: 1
        path: "M 8.800000190734863 0 C 16.478000164031982 0 22.842600226402283 5.675556182861328 24.00860023498535 13.100001335144043 C 26.593600273132324 10.49777889251709 30.162002325057983 8.88888931274414 34.10000228881836 8.88888931274414 L 44 8.88888931274414 L 44 14.44444465637207 C 44 22.42222261428833 37.59800052642822 28.88888931274414 29.700000762939453 28.88888931274414 L 24.200000762939453 28.88888931274414 L 24.200000762939453 40 L 19.80000114440918 40 L 19.80000114440918 22.22222328186035 L 15.40000057220459 22.22222328186035 C 6.894800186157227 22.22222328186035 0 15.25777816772461 0 6.6666669845581055 L 0 0 L 8.800000190734863 0 Z M 39.60000228881836 13.333333969116211 L 34.10000228881836 13.333333969116211 C 28.633002281188965 13.333333969116211 24.200000762939453 17.81111192703247 24.200000762939453 23.33333396911621 L 24.200000762939453 24.444446563720703 L 29.700000762939453 24.444446563720703 C 35.16700077056885 24.444446563720703 39.60000228881836 19.96666669845581 39.60000228881836 14.44444465637207 L 39.60000228881836 13.333333969116211 Z M 8.800000190734863 4.44444465637207 L 4.400000095367432 4.44444465637207 L 4.400000095367432 6.6666669845581055 C 4.400000095367432 12.802222728729248 9.32580041885376 17.77777862548828 15.40000057220459 17.77777862548828 L 19.80000114440918 17.77777862548828 L 19.80000114440918 15.555556297302246 C 19.80000114440918 9.420000553131104 14.874200344085693 4.44444465637207 8.800000190734863 4.44444465637207 Z"
        strokeColor: "transparent"
        fillColor: "#dcdada"
    }
    states: [
        State {
            name: "state_state_normal"
        },
        State {
            name: "state_state_active"
            extend: "state_state_normal"

            PropertyChanges {
                target: buttonUnderline
                x: 49
                y: 55
                height: 100
                color: "#33c2ff"
            }

            PropertyChanges {
                target: buttonBackground
                color: "#4d33c2ff"
                border.color: "#33c2ff"
            }
        }
    ]
}
