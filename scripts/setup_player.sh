#!/bin/bash

set -euo pipefail

printf "reloading window\n"
rpgcli window reload

sleep 0.2

# rpgcli timescale set 0.05
printf "setting position\n"
rpgcli component set 0 PositionComponent '{  "value": {    "x": 0,    "y": 0.1301747277207926,"z": 5}}'
# rpgcli control debug_visuals
sleep 0.2
printf "setting camera to third persion\n"
rpgcli camera third_person_global
