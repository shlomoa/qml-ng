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
    id: singleDial
    width: 150
    height: 170
    state: "state_state_warning"
    property alias dialValueLabelText: dialValueLabel.text
    property alias dialLabelText: dialLabel.text

    Image {
        id: dialBackground
        x: 22
        y: 22
        source: "assets/dialBackground_state_state_warning.png"
    }

    Image {
        id: dialTrackBackground
        x: 10
        y: 10
        source: "assets/dialTrackBackground_state_state_warning.png"
    }

    Item {
        id: dialValue
        x: 42
        y: 151
        width: 65
        height: 19
        Rectangle {
            id: dialValueBackground
            x: 23
            y: -23
            width: 19
            height: 65
            color: "#c03a4d"
            rotation: -90
        }

        Text {
            id: dialValueLabel
            x: 0
            y: 0
            width: 66
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

    Image {
        id: dialTrack
        x: 10
        y: 10
        source: "assets/dialTrack_state_state_warning.png"
    }

    Image {
        id: dialOutline
        x: 0
        y: 0
        source: "assets/dialOutline_state_state_warning.png"
    }

    SvgPathItem {
        id: dialIcon
        x: 57
        y: 53
        width: 34
        height: 38
        strokeWidth: 1
        path: "M 17 0 C 21.508680211173164 5.062189259853177e-15 25.83269551065233 1.801449505399534 29.020813835991753 5.008050524447951 C 32.20893216133118 8.214651543496368 33.99999999999999 12.563736560764998 34 17.09855524826527 L 34 31.34735128848633 C 34.00068240924156 32.768320514490526 33.54876790775193 34.152141149324585 32.710507498847115 35.29595163219966 C 31.8722470899423 36.439762115074736 30.691730207867092 37.283399731072265 29.342011557685005 37.70319719002625 C 27.992292907502918 38.12299464898024 26.544365008672077 38.09686992777529 25.210485034518772 37.6286513342779 C 23.876605060365467 37.16043274078051 22.72693160176277 36.27474862434567 21.929999351501465 35.10143376633482 C 21.43657088941998 35.980432208734804 20.719823287592995 36.71180334970781 19.8530945248074 37.2207109880509 C 18.986365762021805 37.729618626393986 18.000774310694798 37.9977931933623 16.99716642167833 37.9977931933623 C 15.99355853266186 37.9977931933623 15.007967081334854 37.729618626393986 14.141238318549261 37.2207109880509 C 13.274509555763668 36.71180334970781 12.557761953936684 35.980432208734804 12.064333491855198 35.10143376633482 C 11.284254603915745 36.246746028234384 10.167328688833448 37.11775883824056 8.870192686716715 37.592324180677025 C 7.573056684599981 38.06688952311349 6.160769859949747 38.12120640294571 4.831391546461317 37.74765220452755 C 3.5020132329728866 37.374098006109385 2.322220226128896 36.5914108822306 1.457465330759684 35.509355994280725 C 0.5927104353904723 34.42730110633085 0.08636717001597086 33.10015083111416 0.009444660610622829 31.714021814029003 L 0 31.34545249262729 L 0 17.09855524826527 C 3.3553406966449175e-15 12.563736560764998 1.7910660372840033 8.214651543496368 4.9791843626234265 5.008050524447951 C 8.167302687962849 1.801449505399534 12.491319788826836 2.5310946299265884e-15 17 0 L 17 0 Z M 17 18.998394720294744 C 14.912777741750082 18.998394720294744 13.222222222222221 21.126214938026894 13.222222222222221 23.74799340036843 C 13.222222222222221 26.369771862709964 14.912777741750082 28.497592080442118 17 28.497592080442118 C 19.08722225824992 28.497592080442118 20.77777777777778 26.369771862709964 20.77777777777778 23.74799340036843 C 20.77777777777778 21.126214938026894 19.08722225824992 18.998394720294744 17 18.998394720294744 Z M 12.277777777777777 11.399036832176847 C 11.526331057151157 11.39903683217685 10.805661277638542 11.69927809556554 10.274308204650879 12.233711617613487 C 9.742955131663216 12.768145139661433 9.444444444444446 13.49299290676447 9.444444444444445 14.248796040221059 C 9.444444444444445 15.004599173677647 9.742955131663216 15.729446940780685 10.274308204650879 16.26388046282863 C 10.805661277638542 16.798313984876575 11.526331057151157 17.09855524826527 12.277777777777777 17.09855524826527 C 13.029224498404396 17.098555248265267 13.749894277917013 16.798313984876575 14.281247350904676 16.26388046282863 C 14.81260042389234 15.729446940780685 15.111111111111107 15.004599173677647 15.11111111111111 14.248796040221059 C 15.111111111111107 13.49299290676447 14.81260042389234 12.768145139661433 14.281247350904676 12.233711617613487 C 13.749894277917013 11.69927809556554 13.029224498404396 11.399036832176852 12.277777777777777 11.399036832176847 L 12.277777777777777 11.399036832176847 Z M 21.72222222222222 11.399036832176847 C 20.970775501595604 11.39903683217685 20.250105722082985 11.69927809556554 19.71875264909532 12.233711617613487 C 19.18739957610766 12.768145139661433 18.888888888888893 13.49299290676447 18.88888888888889 14.248796040221059 C 18.888888888888893 15.004599173677647 19.18739957610766 15.729446940780685 19.71875264909532 16.26388046282863 C 20.250105722082985 16.798313984876575 20.970775501595604 17.09855524826527 21.72222222222222 17.09855524826527 C 22.47366894284884 17.098555248265267 23.194338722361458 16.798313984876575 23.72569179534912 16.26388046282863 C 24.257044868336784 15.729446940780685 24.55555555555555 15.004599173677647 24.555555555555554 14.248796040221059 C 24.55555555555555 13.49299290676447 24.257044868336784 12.768145139661433 23.72569179534912 12.233711617613487 C 23.194338722361458 11.69927809556554 22.47366894284884 11.399036832176852 21.72222222222222 11.399036832176847 L 21.72222222222222 11.399036832176847 Z"
        strokeColor: "transparent"
        fillColor: "#c03a4d"
    }

    Text {
        id: dialLabel
        x: 48
        y: -27
        width: 55
        height: 20
        color: "#ffffff"
        text: qsTr("LABEL")
        font.pixelSize: 14
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        wrapMode: Text.Wrap
        font.family: "Abel"
        font.weight: Font.Normal
    }
    states: [
        State {
            name: "state_state_warning"
        },
        State {
            name: "state_state_normal"
            extend: "state_state_warning"

            PropertyChanges {
                target: dialTrackBackground
                source: "assets/dialTrackBackground_state_state_normal.png"
            }

            PropertyChanges {
                target: dialBackground
                source: "assets/dialBackground_state_state_normal.png"
            }

            PropertyChanges {
                target: dialIcon
                fillColor: "#dcdada"
            }

            PropertyChanges {
                target: dialTrack
                source: "assets/dialTrack_state_state_normal.png"
            }

            PropertyChanges {
                target: dialValueBackground
                color: "#4f4f4f"
            }

            PropertyChanges {
                target: dialOutline
                source: "assets/dialOutline_state_state_normal.png"
            }
        },
        State {
            name: "state_state_active"
            extend: "state_state_warning"

            PropertyChanges {
                target: dialTrackBackground
                source: "assets/dialTrackBackground_state_state_active.png"
            }

            PropertyChanges {
                target: dialBackground
                source: "assets/dialBackground_state_state_active.png"
            }

            PropertyChanges {
                target: dialIcon
                fillColor: "#33c2ff"
            }

            PropertyChanges {
                target: dialTrack
                source: "assets/dialTrack_state_state_active.png"
            }

            PropertyChanges {
                target: dialValueLabel
                color: "#424242"
            }

            PropertyChanges {
                target: dialValueBackground
                color: "#33c2ff"
            }

            PropertyChanges {
                target: dialOutline
                source: "assets/dialOutline_state_state_active.png"
            }
        }
    ]
}
