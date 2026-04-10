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
    id: selectorDialCombined
    width: 235
    height: 179

    SelectorDial {
        id: selectorDialCombi
        x: 53
        y: 50
        width: 129
        height: 129
        state: "state_state_normal"
    }

    SelectorDialLabel {
        id: selectorDialLabel5
        x: 157
        y: 81
        width: 76
        height: 76
        state: "state_state_normal"
        rotation: 93.44
    }

    SelectorDialLabel {
        id: selectorDialLabel4
        x: 136
        y: 24
        width: 76
        height: 76
        state: "state_state_selected"
        rotation: 46.118
    }

    SelectorDialLabel {
        id: selectorDialLabel3
        x: 79
        y: 0
        width: 76
        height: 76
        state: "state_state_normal"
    }

    SelectorDialLabel {
        id: selectorDialLabel2
        x: 23
        y: 24
        width: 76
        height: 76
        state: "state_state_normal"
        rotation: -46.874
    }

    SelectorDialLabel {
        id: selectorDialLabel1
        x: 2
        y: 80
        width: 76
        height: 76
        state: "state_state_normal"
        rotation: -92.465
    }
}
