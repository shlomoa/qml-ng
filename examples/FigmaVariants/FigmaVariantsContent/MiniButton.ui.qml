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
    id: miniButton
    width: 42
    height: 42
    state: "state_state_checked"

    Rectangle {
        id: miniButtonBackground
        x: 0
        y: 0
        width: 42
        height: 42
        color: "#4d33c2ff"
        border.color: "#33c2ff"
        border.width: 1
    }

    SvgPathItem {
        id: miniButtonIcon
        x: 10
        y: 9
        width: 22
        height: 24
        strokeWidth: 1
        path: "M 4.631578947368421 0 C 7.746315855728953 0 10.4488416094529 1.820400238037109 11.807052110370837 4.489200210571289 C 13.16989426863821 2.4996002197265623 15.411578881113154 1.2 17.947368421052634 1.2 L 22 1.2 L 22 4.2 C 22 8.507999897003174 18.630526216406572 12 14.473684210526317 12 L 12.736842105263158 12 L 12.736842105263158 13.2 L 18.526315789473685 13.2 L 18.526315789473685 21.599999999999998 C 18.526315789473685 22.926000022888182 17.490000022085088 24 16.210526315789473 24 L 6.947368421052632 24 C 5.667894714757016 24 4.631578947368421 22.926000022888182 4.631578947368421 21.599999999999998 L 4.631578947368421 13.2 L 10.421052631578949 13.2 L 10.421052631578949 10.799999999999999 L 8.105263157894736 10.799999999999999 C 3.6288421781439526 10.799999999999999 0 7.039199924468994 0 2.4 L 0 0 L 4.631578947368421 0 Z M 16.210526315789473 15.6 L 6.947368421052632 15.6 L 6.947368421052632 21.599999999999998 L 16.210526315789473 21.599999999999998 L 16.210526315789473 15.6 Z M 19.68421052631579 3.5999999999999996 L 17.947368421052634 3.5999999999999996 C 15.070000121467993 3.5999999999999996 12.736842105263158 6.01800012588501 12.736842105263158 9 L 12.736842105263158 9.6 L 14.473684210526317 9.6 C 17.351052510110957 9.6 19.68421052631579 7.18199987411499 19.68421052631579 4.2 L 19.68421052631579 3.5999999999999996 Z M 4.631578947368421 2.4 L 2.3157894736842106 2.4 C 2.3157894736842106 5.71319990158081 4.908315884439569 8.4 8.105263157894736 8.4 L 10.421052631578949 8.4 C 10.421052631578949 5.0868000984191895 7.828526220823589 2.4 4.631578947368421 2.4 Z"
        strokeColor: "transparent"
        fillColor: "#33c2ff"
    }
    states: [
        State {
            name: "state_state_checked"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_checked"

            PropertyChanges {
                target: miniButtonIcon
                fillColor: "#dcdada"
            }

            PropertyChanges {
                target: miniButtonBackground
                color: "#2e2e2e"
                border.color: "#767676"
            }
        }
    ]
}
