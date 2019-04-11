window.onload = function() {

    var game;
    var fontLoader;
    var useBitmapFont = true;
    var useGroupNineSlice = true;
    var useGroupsForCells = true;
    var useCacheForGroups = true;
    var axisWidth = 30;
    var symbols;
    var textStyle = { fill: '#333333', font: 'normal 24px 04b_03', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' };
    var tweenDuration = 1000;
    var tweenEase = 'Bounce.easeOut';
    var axesCount;
    var verticalAxesCount;
    var horizontalAxesCount;
    var leftAxesCount;
    var rightAxesCount;
    var topAxesCount;
    var bottomAxesCount;
    var verticalCellsCount;
    var horizontalCellsCount;
    var maxCellsSide;
    var totalCellsCount;
    var cellSize;
    var cells;
    var cellsArray;
    var picture;
    var groupNoMove;
    var groupMoveForward;
    var groupMoveBackward;
    var axes;
    var hud;
    var axisDown;
    var axisOver;
    var shuffling;
    var solved;
    var actionsCounter;
    var minActions;
    var pictureUrl;
    var timerStarted;
    var moveTween;
    var maze;

    if (useBitmapFont) {
        createGame();
    } else {
        fontLoader = new FontFaceObserver('04b_03');
        fontLoader.load(null, 5000).then(createGame);
    }

    function createGame() {
        window.PhaserGlobal = { disableAudio: true, hideBanner: true };
        game = new Phaser.Game({
            width: 1144,
            height: 662,
            renderer: Phaser.WEBGL,
            backgroundColor: "#555555",
            scaleMode: Phaser.ScaleManager.SHOW_ALL,
            alignV: true,
            alignH: true,
            keyboard: false,
            maxPointers: 1,
            mouseWheel: false,
            enableDebug: false,
            antialias: false
        });
        game.state.add('PreloadJson', { preload: preloadJson, create: startPlay });
        game.state.add('Play', { init: init, preload: preload, create: create });
        game.state.start('PreloadJson');
    }

    function preloadJson() {
        if (!useGroupNineSlice) {
            game.plugins.add(PhaserNineSlice.Plugin);
        }
        game.load.atlas('gameAtlas', 'assets/atlas.png', 'assets/atlas.json', Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
        game.load.json('picturesMetadata', 'pictures-metadata.json');

        if (useBitmapFont) {
            game.load.xml('04b_03-data', 'fonts/04b_03.fnt');
        }
    }

    function startPlay() {
        if (useBitmapFont) {
            game.cache.addBitmapFontFromAtlas('04b_03-gray', 'gameAtlas', 'font-04b_03-gray', '04b_03-data');
            game.cache.addBitmapFontFromAtlas('04b_03-pink', 'gameAtlas', 'font-04b_03-pink', '04b_03-data');
            game.cache.getBaseTexture('gameAtlas').scaleMode = Phaser.scaleModes.NEAREST;
        }

        game.state.start('Play');
    }

    function init() {
        var solvedPictures = localStorage.getItem('deshgramRollerSolvedPictures');
        solvedPictures = solvedPictures === null ? [] : solvedPictures.split('|');
        var picturesMetadata = game.cache.getJSON('picturesMetadata');
        var keys = Object.keys(picturesMetadata).filter(function (key) {
            return solvedPictures.indexOf(key) === -1;
        });
        if (keys.length === 0) {
            axesCount = Math.floor(Math.random() * 6) + 4;
            pictureUrl = null;
        } else {
            var aspectRatios = {
                1: keys.some(function (key) { return picturesMetadata[key].aspectRatio === 1; }),
                2: keys.some(function (key) { return picturesMetadata[key].aspectRatio === 2; })
            };

            axesCount = Math.floor(Number(localStorage.getItem('deshgramRollerSolvedAxesCount') || '3') + 1);
            if (isNaN(axesCount) || axesCount < 4 || axesCount > 9) {
                if (aspectRatios["1"] === aspectRatios["2"]) {
                    axesCount = Math.floor(Math.random() * 6) + 4;
                } else {
                    axesCount = Math.floor(Math.random() * 3) * 2 + 4 + (aspectRatios["1"] === false ? 1 : 0);
                }
            } else if (
                (axesCount % 2 === 0 && aspectRatios["1"] === false) ||
                (axesCount % 2 === 1 && aspectRatios["2"] === false)
            ) {
                keys = Object.keys(picturesMetadata);
            }
            keys = keys.filter(function (key) {
                return picturesMetadata[key].aspectRatio === (axesCount % 2) + 1;
            });
            pictureUrl = keys[Math.floor(Math.random() * keys.length)] || '';
        }

        verticalAxesCount = Math.floor(axesCount / 2);
        horizontalAxesCount = Math.ceil(axesCount / 2);
        leftAxesCount = Math.ceil(verticalAxesCount / 2);
        rightAxesCount = Math.floor(verticalAxesCount / 2);
        topAxesCount = Math.ceil(horizontalAxesCount / 2);
        bottomAxesCount = Math.floor(horizontalAxesCount / 2);
        verticalCellsCount = Math.pow(2, verticalAxesCount);
        horizontalCellsCount = Math.pow(2, horizontalAxesCount);
        maxCellsSide = Math.max(verticalCellsCount, horizontalCellsCount);
        totalCellsCount = verticalCellsCount * horizontalCellsCount;
        cellSize = 512 / Math.min(verticalCellsCount, horizontalCellsCount);
        shuffling = true;
        solved = false;
        actionsCounter = 0;
        picture = null;

        if (!pictureUrl) {
            maze = generateMaze(horizontalCellsCount, verticalCellsCount);
        } else {
            maze = null;
        }
    }

    function preload () {
        if (!maze) {
            game.load.spritesheet('picture', 'assets/' + pictureUrl, cellSize, cellSize);
        }
    }

    function handleMoveTweenUpdate(_, value, moveTweenData) {
        if (typeof value !== 'number') {
            value = 1;
        }
        var percent = moveTweenData ? moveTweenData.percent : 1;
        var moveTweenIsRunning = moveTween.isRunning;
        var i;
        var x;
        var y;
        var axis;
        var cell;
        var tweenData;
        var updateRotation;
        for (i = 0; i < axesCount; ++i) {
            axis = axes.getAt(i);
            if (axis.isTweening) {
                axis.isTweening = moveTweenIsRunning;
            } else {
                continue;
            }
            tweenData = axis.tweenData;
            updateRotation = tweenData.isTweeningRotation;
            if (tweenData.isTweeningPosition) {
                axis.x = tweenData.offset.x + tweenData.distance.x * value;
                axis.y = tweenData.offset.y + tweenData.distance.y * value;
                tweenData.isTweeningPosition = moveTweenIsRunning;
            }
            if (tweenData.isTweeningRotation) {
                axis.rotation = tweenData.rotationOffset + tweenData.rotationDistance * value;
                tweenData.isTweeningRotation = moveTweenIsRunning;
            }
            for (x = 0; x < maxCellsSide; ++x) {
                cell = axis.getAt(x);
                tweenData = cell.tweenData;
                if (tweenData.isTweeningX) {
                    cell.x = tweenData.xOffset + tweenData.xDistance * value;
                    tweenData.isTweeningX = moveTweenIsRunning;
                }
                if (tweenData.isTweeningScale) {
                    y = tweenData.scaleDistance > 0 ?
                        tweenData.scaleOffset + tweenData.scaleDistance * value :
                        Math.max(0, tweenData.scaleOffset + tweenData.scaleDistance * percent * 4);
                    cell.scale.x = cell.scale.y = y;
                    tweenData.isTweeningScale = moveTweenIsRunning;
                    if (!moveTweenIsRunning && y === 0) {
                        cell.visible = false;
                    }
                }
                if (tweenData.isTweeningWidth) {
                    cell.getAt(0).resize(tweenData.widthOffset + tweenData.widthDistance * value, axisWidth);
                    cell.getAt(1).x = cell.getAt(0).localWidth * 0.5;
                    tweenData.isTweeningWidth = moveTweenIsRunning;
                }
                if (updateRotation) {
                    cell.getAt(1).rotation = -axis.rotation;
                }
            }
        }
        if (useGroupsForCells) {
            groupMoveBackward.x = groupMoveBackward.tweenData.distance.x * value;
            groupMoveBackward.y = groupMoveBackward.tweenData.distance.y * value;
            groupMoveForward.x = groupMoveForward.tweenData.distance.x * value;
            groupMoveForward.y = groupMoveForward.tweenData.distance.y * value;
        } else {
            for (i = 0; i < totalCellsCount; ++i) {
                cell = cells.getAt(i);
                tweenData = cell.tweenData;
                if (tweenData.isTweening) {
                    cell.x = tweenData.offset.x + tweenData.distance.x * value;
                    cell.y = tweenData.offset.y + tweenData.distance.y * value;
                    tweenData.isTweening = moveTweenIsRunning;
                }
            }
        }
    }

    function getMazePiece(cellX, cellY) {
        var mazeCell = maze[cellY][cellX];
        var binary = (mazeCell.right ? '0' : '1') +
            (mazeCell.left ? '0' : '1') +
            (mazeCell.bottom ? '0' : '1') +
            (mazeCell.top ? '0' : '1');
        return 'mazePiece-' + binary + '-' + parseInt(binary, 2);
    }

    function createCells () {
        cells = game.add.group();
        cells.x = 2 * axisWidth + (horizontalAxesCount === verticalAxesCount ? 256 : 0);
        cells.y = 3 * axisWidth;
        cellsArray = [];

        if (useGroupsForCells) {
            groupNoMove = game.add.group(cells);
            groupMoveForward = game.add.group(cells);
            groupMoveBackward = game.add.group(cells);

            groupMoveForward.tweenData = {
                distance: new Phaser.Point(0, 0)
            };
            groupMoveBackward.tweenData = {
                distance: new Phaser.Point(0, 0)
            };
        }

        var tmp;
        for (var y = 0; y < verticalCellsCount; ++y) {
            for (var x = 0; x < horizontalCellsCount; ++x) {
                var cellIndex = x + y * horizontalCellsCount;
                var cell = maze ?
                    game.add.image(0, 0, 'gameAtlas', getMazePiece(x, y), useGroupsForCells ? groupNoMove : cells) :
                    game.add.image(0, 0, 'picture', cellIndex, useGroupsForCells ? groupNoMove : cells);
                if (maze) {
                    if (x === 0 && y === 0) {
                        tmp = game.add.group(cell.parent);
                        tmp.add(cell);
                        game.add.image(0, 0, 'gameAtlas', 'mazeStartFlag', tmp);
                        cell = tmp;
                    } else if (x === horizontalCellsCount - 1 && y === verticalCellsCount - 1) {
                        tmp = game.add.group(cell.parent);
                        tmp.add(cell);
                        game.add.image(0, 0, 'gameAtlas', 'mazeFinishFlag', tmp);
                        cell = tmp;
                    }
                    cell.scale.set(cellSize / 16);
                }
                cell.x = x * cellSize;
                cell.y = y * cellSize;
                if (!useGroupsForCells) {
                    cell.tweenData = {
                        distance: new Phaser.Point(0, 0),
                        offset: new Phaser.Point(0, 0),
                        isTweening: false
                    };
                }
                cellsArray.push(cell);
            }
        }
    }

    function calcTargetPosition(axis) {
        var targetPosition = {
            targetX: -axisWidth * 0.5,
            targetY: -axisWidth * 0.5
        };
        var log2 = Math.log(axis.isRepeated) / Math.LN2;
        if (axis.isHorizontal) {
            targetPosition.targetY += (log2 < topAxesCount) ? -axisWidth * log2 : cellSize * verticalCellsCount + axisWidth * (log2 - topAxesCount + 1);
        } else {
            targetPosition.targetX += (log2 < leftAxesCount) ? -axisWidth * log2 : cellSize * horizontalCellsCount + axisWidth * (log2 - leftAxesCount + 1);
        }

        return targetPosition;
    }

    function toggleAxisRepeated(axis, span) {
        axis.isRepeated = span;

        axis.isTweening = true;

        var targetPosition = calcTargetPosition(axis);

        if (shuffling) {
            axis.x = targetPosition.targetX;
            axis.y = targetPosition.targetY;
        } else {
            axis.tweenData.offset.x = axis.x;
            axis.tweenData.offset.y = axis.y;
            axis.tweenData.distance.x = targetPosition.targetX - axis.tweenData.offset.x;
            axis.tweenData.distance.y = targetPosition.targetY - axis.tweenData.offset.y;
            axis.tweenData.isTweeningPosition = axis.tweenData.distance.x !== 0 || axis.tweenData.distance.y !== 0;
        }

        for (var x = 0; x < maxCellsSide; ++x) {
            var cell = axis.getAt(x);
            var hide = (x + 1) * span > (axis.isHorizontal ? horizontalCellsCount : verticalCellsCount);

            if (shuffling) {
                cell.getAt(0).resize(cellSize * span, axisWidth);
                cell.getAt(1).x = cellSize * span * 0.5;
                cell.x = x * cellSize * span;
                if (hide) {
                    cell.visible = false;
                    cell.scale.x = 0;
                    cell.scale.y = 0;
                } else {
                    cell.visible = true;
                    cell.scale.x = 1;
                    cell.scale.y = 1;
                }
            } else {
                cell.tweenData.widthOffset = cell.getAt(0).localWidth;
                cell.tweenData.widthDistance = cellSize * span - cell.tweenData.widthOffset;
                cell.tweenData.isTweeningWidth = cell.tweenData.widthDistance !== 0;
                cell.tweenData.xOffset = cell.x;
                cell.tweenData.xDistance = (x * cellSize * span) - cell.tweenData.xOffset;
                cell.tweenData.isTweeningX = cell.tweenData.xDistance !== 0;
                cell.tweenData.scaleOffset = cell.scale.x;
                if (hide) {
                    cell.tweenData.scaleDistance = -cell.tweenData.scaleOffset;
                } else {
                    cell.visible = true;
                    cell.tweenData.scaleDistance = 1 - cell.tweenData.scaleOffset;
                }
                cell.tweenData.isTweeningScale = cell.tweenData.scaleDistance !== 0;
            }
        }
    }

    function toggleAxisForward(axis) {
        axis.isForward = !axis.isForward;

        axis.isTweening = true;

        for (var x = 0; x < maxCellsSide; x += 2) {
            var cell1 = axis.getAt(x);
            var cell2 = axis.getAt(x + 1);
            axis.swap(cell1, cell2);

            if (shuffling) {
                cell1.x = cellSize * axis.isRepeated * (x + 1);
                cell2.x = cellSize * axis.isRepeated * x;
            } else {
                cell1.tweenData.xOffset = cell1.x;
                cell1.tweenData.xDistance = (cellSize * axis.isRepeated * (x + 1)) - cell1.tweenData.xOffset;
                cell1.tweenData.isTweeningX = cell1.tweenData.xDistance !== 0;
                cell2.tweenData.xOffset = cell2.x;
                cell2.tweenData.xDistance = (cellSize * axis.isRepeated * x) - cell2.tweenData.xOffset;
                cell2.tweenData.isTweeningX = cell2.tweenData.xDistance !== 0;
            }
        }
    }

    function toggleAxisHorizontal(axis) {
        axis.isHorizontal = !axis.isHorizontal;

        axis.isTweening = true;

        var targetPosition = calcTargetPosition(axis);

        if (shuffling) {
            axis.rotation = axis.isHorizontal ? 0 : Math.PI * 0.5;
            axis.x = targetPosition.targetX;
            axis.y = targetPosition.targetY;
        } else {
            axis.tweenData.offset.x = axis.x;
            axis.tweenData.offset.y = axis.y;
            axis.tweenData.distance.x = targetPosition.targetX - axis.tweenData.offset.x;
            axis.tweenData.distance.y = targetPosition.targetY - axis.tweenData.offset.y;
            axis.tweenData.isTweeningPosition = axis.tweenData.distance.x !== 0 || axis.tweenData.distance.y !== 0;
            axis.tweenData.rotationOffset = axis.rotation;
            axis.tweenData.rotationDistance = (axis.isHorizontal ? 0 : Math.PI * 0.5) - axis.tweenData.rotationOffset;
            axis.tweenData.isTweeningRotation = axis.tweenData.rotationDistance !== 0;
        }

        for (var x = 0; x < maxCellsSide; ++x) {
            var cell = axis.getAt(x);

            if (shuffling) {
                cell.getAt(1).rotation = -axis.rotation;
            }
        }
    }

    function toggleAxisHighlighted(axis) {
        axis.isHighlighted = !axis.isHighlighted;
        var newTint = axis.isHighlighted ? 0xff9999 : 0xffffff;

        for (var x = 0; x < maxCellsSide; ++x) {
            var cell = axis.getAt(x);
            var cellBackground = cell.getAt(0);
            if (useGroupNineSlice) {
                var children = cellBackground.children;
                for (var y = 0; y < children.length; ++y) {
                    children[y].tint = newTint;
                }
            } else {
                cellBackground.tint = newTint;
            }
        }
    }

    function updateCells() {
        var distance = useGroupsForCells ? new Phaser.Point() : undefined;
        for (var i = 0; i < totalCellsCount; ++i) {
            var cell = cellsArray[i];
            var x = 0;
            var y = 0;
            for (var j = 0, c = i >> j & 1; j < axesCount; ++j, c = i >> j & 1) {
                var axis = axes.getAt(j);
                if (axis.isHorizontal) {
                    x += (axis.isForward ? c : 1 - c) * axis.isRepeated;
                } else {
                    y += (axis.isForward ? c : 1 - c) * axis.isRepeated;
                }
            }
            x *= cellSize;
            y *= cellSize;
            if (shuffling) {
                cell.x = x;
                cell.y = y;
            } else {
                if (useGroupsForCells) {
                    if (cell.parent !== cells) {
                        cell.x += cell.parent.x;
                        cell.y += cell.parent.y;
                    }

                    distance.x = x - cell.x;
                    distance.y = y - cell.y;

                    if (distance.x !== 0 || distance.y !== 0) {
                        if (distance.x > 0 || (distance.x === 0 && distance.y > 0)) {
                            groupMoveForward.add(cell, true);
                            groupMoveForward.tweenData.distance.x = distance.x;
                            groupMoveForward.tweenData.distance.y = distance.y;
                        } else {
                            groupMoveBackward.add(cell, true);
                            groupMoveBackward.tweenData.distance.x = distance.x;
                            groupMoveBackward.tweenData.distance.y = distance.y;
                        }
                    } else {
                        groupNoMove.add(cell, true);
                    }
                } else {
                    cell.tweenData.offset.x = cell.x;
                    cell.tweenData.offset.y = cell.y;
                    cell.tweenData.distance.x = x - cell.tweenData.offset.x;
                    cell.tweenData.distance.y = y - cell.tweenData.offset.y;
                    cell.tweenData.isTweening = cell.tweenData.distance.x !== 0 || cell.tweenData.distance.y !== 0;
                }
            }
        }

        if (useGroupsForCells) {
            groupNoMove.x = 0;
            groupNoMove.y = 0;
            groupMoveForward.x = 0;
            groupMoveForward.y = 0;
            groupMoveBackward.x = 0;
            groupMoveBackward.y = 0;

            if (!shuffling && useCacheForGroups) {
                if (groupNoMove.cacheAsBitmap) {
                    groupNoMove.updateCache();
                } else {
                    groupNoMove.cacheAsBitmap = true;
                }

                if (groupMoveForward.cacheAsBitmap) {
                    groupMoveForward.updateCache();
                } else {
                    groupMoveForward.cacheAsBitmap = true;
                }

                if (groupMoveBackward.cacheAsBitmap) {
                    groupMoveBackward.updateCache();
                } else {
                    groupMoveBackward.cacheAsBitmap = true;
                }
            }
        }
    }

    function getAxisInitialConfig(index) {
        return {
            isRepeated: Math.pow(2, index % horizontalAxesCount),
            isHorizontal: index < horizontalAxesCount,
            isForward: true
        };
    }

    function getAxisIndexByInitialConfig(initialConfig) {
        return (Math.log(initialConfig.isRepeated) / Math.LN2) + (initialConfig.isHorizontal ? 0 : horizontalAxesCount);
    }

    function getAxisDistanceFromInitialConfig(index) {
        var score = 0;
        var axis = axes.getAt(index);
        var initialConfig = getAxisInitialConfig(index);

        if (axis.isRepeated !== initialConfig.isRepeated || axis.isHorizontal !== initialConfig.isHorizontal) {
            score += 1;
        }

        if (axis.isForward !== initialConfig.isForward) {
            score += 1;
        }

        return score;
    }

    function getTotalDistanceFromInitialConfig() {
        var score = 0;

        for (var i = 0; i < axesCount; ++i) {
            score += getAxisDistanceFromInitialConfig(i);
        }

        return score;
    }

    function onDown(sprite, pointer, axis) {
        if (pointer.isMouse) {
            axisDown = axis;
        } else {
            if (!axisDown) {
                axisDown = axis;
            } else {
                axisOver = axis;
            }
        }

        if (!axis.isHighlighted) {
            toggleAxisHighlighted(axis);
        }
    }

    function onOver(sprite, pointer, axis) {
        if (pointer.isMouse) {
            axisOver = axis;

            if (axisDown && !axis.isHighlighted) {
                toggleAxisHighlighted(axis);
            }
        }
    }

    function onOut(sprite, pointer, axis) {
        if (pointer.isMouse) {
            if (axis === axisOver) {
                axisOver = null;
            }
        } else {
            if (axis === axisDown) {
                axisDown = null;
            }
            if (axis === axisOver) {
                axisOver = null;
            }
        }

        if (axis !== axisDown && axis !== axisOver && axis.isHighlighted) {
            toggleAxisHighlighted(axis);
        }
    }

    function onUp(sprite, pointer) {
        if (pointer && !pointer.isMouse) {
            if (axisDown && !axisOver) {
                return;
            }
        }

        if (axisDown && axisOver && (shuffling || (game.time.elapsedSecondsSince(timerStarted) > 0 && !moveTween.isRunning && !solved))) {
            if (axisDown === axisOver) {
                toggleAxisForward(axisOver);
            }
            if (axisDown.isHorizontal !== axisOver.isHorizontal) {
                toggleAxisHorizontal(axisDown);
                toggleAxisHorizontal(axisOver);
                if (axisDown.isRepeated === axisOver.isRepeated) {
                    toggleAxisRepeated(axisDown, axisDown.isRepeated);
                    toggleAxisRepeated(axisOver, axisOver.isRepeated);
                }
            }
            if (axisDown.isRepeated !== axisOver.isRepeated) {
                var axisDownSpan = axisDown.isRepeated;
                toggleAxisRepeated(axisDown, axisOver.isRepeated);
                toggleAxisRepeated(axisOver, axisDownSpan);
            }
            updateCells();
            if (!shuffling) {
                moveTween.start();
                updateActionsCounter();
                checkSolved();
            }
        }

        if (axisDown && axisDown.isHighlighted) {
            toggleAxisHighlighted(axisDown);
        }
        if (axisOver && axisOver.isHighlighted) {
            toggleAxisHighlighted(axisOver);
        }
        axisDown = null;
        axisOver = null;
    }

    function createAxes () {
        axes = game.add.group();
        axes.x = 2 * axisWidth + (horizontalAxesCount === verticalAxesCount ? 256 : 0);
        axes.y = 3 * axisWidth;
        symbols = Phaser.ArrayUtils.shuffle('abcdefghijklmopqrstuvwxyz'.split('')).slice(0, 18);

        for (var y = 0; y < axesCount; ++y) {
            var axis = game.add.group(axes);
            axis.isRepeated = 1;
            axis.isHorizontal = true;
            axis.isForward = true;
            axis.isHighlighted = false;
            axis.tweenData = {
                distance: new Phaser.Point(0, 0),
                offset: new Phaser.Point(0, 0),
                rotationDistance: 0,
                rotationOffset: 0,
                isTweeningPosition: false,
                isTweeningRotation: false,
                isTweening: false
            };

            for (var x = 0; x < maxCellsSide; ++x) {
                var cell = game.add.group(axis);
                cell.inputEnableChildren = true;
                cell.onChildInputDown.add(onDown, this, 0, axis);
                cell.onChildInputOver.add(onOver, this, 0, axis);
                cell.onChildInputOut.add(onOut, this, 0, axis);
                cell.onChildInputUp.add(onUp, this, 0, axis);
                var cellBackground;
                if (useGroupNineSlice) {
                    cellBackground = new GroupNineSlice(game, cell, null, {
                        key: 'gameAtlas',
                        topLeftFrame: 'cellBackgroundTopLeft',
                        topCenterFrame: 'cellBackgroundTopCenter',
                        topRightFrame: 'cellBackgroundTopRight',
                        middleLeftFrame: 'cellBackgroundMiddleLeft',
                        middleCenterFrame: 'cellBackgroundMiddleCenter',
                        middleRightFrame: 'cellBackgroundMiddleRight',
                        bottomLeftFrame: 'cellBackgroundBottomLeft',
                        bottomCenterFrame: 'cellBackgroundBottomCenter',
                        bottomRightFrame: 'cellBackgroundBottomRight',
                        inputEnableChildren: true,
                        useHandCursor: true,
                        propagateEvents: true
                    });
                } else {
                    cellBackground = new PhaserNineSlice.NineSlice(game, 0, 0, 'gameAtlas', 'cellBackground', cellSize, axisWidth, {
                        top: 2,
                        bottom: 2,
                        left: 2,
                        right: 2
                    });
                    cell.add(cellBackground);
                    cellBackground.input.useHandCursor = true;
                }
                var str = symbols[y * 2 + x % 2];
                var cellText;
                if (useBitmapFont) {
                    cellText = game.add.bitmapText(cellSize * 0.5, axisWidth * 0.5, '04b_03-gray', str, 24, cell);
                    cellText.anchor.set(0.5);
                } else {
                    cellText = game.add.text(cellSize * 0.5, axisWidth * 0.5, str, textStyle);
                    cellText.setTextBounds(-cellSize * 0.5, -cellSize * 0.5, cellSize, cellSize);
                    cell.add(cellText);
                }
                cell.x = x * cellSize;
                cellText.input.useHandCursor = true;
                cell.tweenData = {
                    isTweeningX: false,
                    xOffset: 0,
                    xDistance: 0,
                    isTweeningScale: false,
                    scaleOffset: 0,
                    scaleDistance: 0,
                    isTweeningWidth: false,
                    widthOffset: 0,
                    widthDistance: 0
                };
            }

            axis.pivot.y = axisWidth * 0.5;
            axis.pivot.x = -axisWidth * 0.5;
            axis.x = -axisWidth * 0.5;
            axis.y = -axisWidth * 0.5;

            if (y >= horizontalAxesCount) {
                toggleAxisHorizontal(axis);
            }
            toggleAxisRepeated(axis, Math.pow(2, y % horizontalAxesCount));
        }
    }

    function handleNextLevelButton() {
        if (game.load.isLoading || game.tweens.getAll().length > 0) {
            return;
        }

        game.state.restart();
    }

    function handleRestartLevelButton() {
        if (game.load.isLoading || game.tweens.getAll().length > 0) {
            return;
        }

        if (!maze) {
            var solvedPictures = localStorage.getItem('deshgramRollerSolvedPictures').split('|');
            pictureUrl = solvedPictures[solvedPictures.length - 1];
        }

        localStorage.setItem('deshgramRollerSolvedAxesCount', String(axesCount - 1));

        shuffling = true;
        solved = false;
        actionsCounter = -1;
        updateActionsCounter();
        if (picture) {
            picture.destroy();
            picture = null;
        }
        cells.visible = true;
        cells.x = 2 * axisWidth + (horizontalAxesCount === verticalAxesCount ? 256 : 0);
        axes.visible = true;
        axes.alpha = 1;
        updateSourceText();
        hud.getAt(1).visible = false;
        hud.getAt(2).visible = false;
        hud.getAt(3).visible = false;
        hud.getAt(5).visible = false;
        hud.getAt(6).visible = false;
        hud.getAt(7).visible = false;

        if (useGroupsForCells && useCacheForGroups) {
            groupNoMove.cacheAsBitmap = false;
            groupMoveForward.cacheAsBitmap = false;
            groupMoveBackward.cacheAsBitmap = false;
        }

        shuffleAxes();
        calcMinActions();

        introAnimation();

        timerStarted = Date.now() + 3000;
    }

    function updateSourceText() {
        var sourceText = hud.getAt(1);
        var picturesMetadata = game.cache.getJSON('picturesMetadata');
        var caption = '';
        var url = null;
        if (picturesMetadata.hasOwnProperty(pictureUrl)) {
            caption = picturesMetadata[pictureUrl].caption || '';
            url = picturesMetadata[pictureUrl].url;
        }
        sourceText.text = caption;
        if (url) {
            sourceText.inputEnabled = true;
            sourceText.input.useHandCursor = true;
            sourceText.events.onInputUp.removeAll();
            sourceText.events.onInputUp.add(function () { window.top.location.href = url; });
        } else {
            sourceText.inputEnabled = false;
        }
    }

    function showOtherPicture(newPictureUrl, isPrev) {
        var pictureToHide = picture || cells;
        game.add.tween(pictureToHide).to({
            x: pictureToHide.x + 1144 * (isPrev ? 1 : -1)
        }, tweenDuration, 'Expo.easeInOut', true)
            .onComplete.addOnce(function (target) {
                if (target !== cells) {
                    target.destroy();
                } else {
                    target.visible = false;
                }
            });

        picture = game.add.image(2 * axisWidth, 3 * axisWidth, newPictureUrl, null);
        picture.x += picture.width === picture.height ? 256 : 0;
        game.add.tween(picture).from({
            x: picture.x + 1144 * (isPrev ? -1 : 1)
        }, tweenDuration, 'Expo.easeInOut', true);
        pictureUrl = newPictureUrl;
        updateSourceText();
    }

    function handlePrevNextPictureButton(btn, pointer, isOver, isPrev) {
        if (game.load.isLoading || game.tweens.getAll().length > 0) {
            return;
        }
        var solvedPictures = localStorage.getItem('deshgramRollerSolvedPictures');
        solvedPictures = solvedPictures === null ? [] : solvedPictures.split('|');
        var currentPictureIndex = solvedPictures.indexOf(pictureUrl);
        if (currentPictureIndex < 0) {
            currentPictureIndex = solvedPictures.length;
        }
        var newPictureUrl;
        if (isPrev && currentPictureIndex > 0) {
            currentPictureIndex -= 1;
        } else if (!isPrev && currentPictureIndex < solvedPictures.length - 1) {
            currentPictureIndex += 1;
        } else {
            return;
        }
        hud.getAt(6).visible = currentPictureIndex > 0;
        hud.getAt(7).visible = currentPictureIndex < solvedPictures.length - 1;
        newPictureUrl = solvedPictures[currentPictureIndex];
        if (game.cache.checkImageKey(newPictureUrl)) {
            showOtherPicture(newPictureUrl, isPrev);
        } else {
            game.load.image(newPictureUrl, 'assets/' + newPictureUrl);
            game.load.onLoadComplete.addOnce(showOtherPicture, this, 0, newPictureUrl, isPrev);
            game.load.start();
        }
    }

    function createHud() {
        var hudTextStyle = Object.assign({}, textStyle, { fill: '#FF9999' });
        var hudTextStyleBig = Object.assign({}, hudTextStyle, { font: 'normal 48px 04b_03' });

        hud = game.add.group();

        var actionsCounterText;
        if (useBitmapFont) {
            actionsCounterText = game.add.bitmapText(5, 0, '04b_03-pink', 'Actions: ' + actionsCounter, 24, hud);
        } else {
            actionsCounterText = game.add.text(5, 0, 'Actions: ' + actionsCounter, hudTextStyle);
            hud.add(actionsCounterText);
        }

        var picturesMetadata = game.cache.getJSON('picturesMetadata');
        var caption = '';
        var url = null;
        if (picturesMetadata.hasOwnProperty(pictureUrl)) {
            caption = picturesMetadata[pictureUrl].caption || '';
            url = picturesMetadata[pictureUrl].url;
        }
        var sourceText;
        if (useBitmapFont) {
            sourceText = game.add.bitmapText(1144 / 2, 4 * axisWidth + 512, '04b_03-pink', caption, 24, hud);
            sourceText.anchor.set(0.5, 0.5);
            sourceText.hitArea = new Phaser.Rectangle(-1144 / 2, -axisWidth, 1144, axisWidth * 2);
        } else {
            sourceText = game.add.text(0, 3 * axisWidth + 512, caption, hudTextStyle);
            sourceText.setTextBounds(0, 0, 1144, axisWidth * 2);
            var sourceTextBounds = sourceText.getBounds();
            sourceText.hitArea = new Phaser.Rectangle((sourceTextBounds.width - 1144) / 2, (sourceTextBounds.height - (axisWidth * 2)) / 2, 1144, axisWidth * 2);
            hud.add(sourceText);
        }
        if (url) {
            sourceText.inputEnabled = true;
            sourceText.input.useHandCursor = true;
            sourceText.events.onInputUp.add(function () { window.top.location.href = url; });
        }
        sourceText.visible = false;

        var nextLevelText;
        if (useBitmapFont) {
            nextLevelText = game.add.bitmapText(0, 0, '04b_03-pink', 'Next Level >', 24, hud);
        } else {
            nextLevelText = game.add.text(0, 0, 'Next Level >', hudTextStyle);
            hud.add(nextLevelText);
        }
        nextLevelText.hitArea = new Phaser.Rectangle(0, 0, nextLevelText.width, axisWidth * 2);
        nextLevelText.inputEnabled = true;
        nextLevelText.input.useHandCursor = true;
        nextLevelText.events.onInputUp.add(handleNextLevelButton);
        nextLevelText.visible = false;
        nextLevelText.x = 1144 - nextLevelText.width - 5;

        var minActionsText;
        if (useBitmapFont) {
            minActionsText = game.add.bitmapText(150, 0, '04b_03-pink', 'Min Actions: ' + minActions, 24, hud);
        } else {
            minActionsText = game.add.text(150, 0, 'Min Actions: ' + minActions, hudTextStyle);
            hud.add(minActionsText);
        }
        minActionsText.x = actionsCounterText.x + actionsCounterText.width + 60;
        minActionsText.visible = false;

        var timerText;
        if (useBitmapFont) {
            timerText = game.add.bitmapText(1144 / 2, 0, '04b_03-pink', '00:00', 24, hud);
            timerText.anchor.set(0.5, 0);
        } else {
            timerText = game.add.text(1144 / 2, 0, '00:00', hudTextStyle);
            timerText.x -= timerText.width / 2;
            hud.add(timerText);
        }

        var restartLevelText;
        if (useBitmapFont) {
            restartLevelText = game.add.bitmapText(0, 0, '04b_03-pink', 'Restart Level', 24, hud);
        } else {
            restartLevelText = game.add.text(0, 0, 'Restart Level', hudTextStyle);
            hud.add(restartLevelText);
        }
        restartLevelText.hitArea = new Phaser.Rectangle(0, 0, restartLevelText.width, axisWidth * 2);
        restartLevelText.inputEnabled = true;
        restartLevelText.input.useHandCursor = true;
        restartLevelText.events.onInputUp.add(handleRestartLevelButton);
        restartLevelText.visible = false;
        restartLevelText.x = nextLevelText.x - restartLevelText.width - 30;


        var prevPictureText;
        if (useBitmapFont) {
            prevPictureText = game.add.bitmapText(axisWidth, axisWidth * 3 + 512 / 2, '04b_03-pink', '<', 48, hud);
            prevPictureText.anchor.set(0.5, 0.5);
            prevPictureText.hitArea = new Phaser.Rectangle(-axisWidth, -30, axisWidth * 2, 60);
        } else {
            prevPictureText = game.add.text(0, axisWidth * 3 + 512 / 2 - 30, '<', hudTextStyleBig);
            prevPictureText.setTextBounds(0, 0, axisWidth * 2, 60);
            var prevPictureTextBounds = prevPictureText.getBounds();
            prevPictureText.hitArea = new Phaser.Rectangle((prevPictureTextBounds.width - axisWidth * 2) / 2, (prevPictureTextBounds.height - 60) / 2, axisWidth * 2, 60);
            hud.add(restartLevelText);
        }
        prevPictureText.inputEnabled = true;
        prevPictureText.input.useHandCursor = true;
        prevPictureText.events.onInputUp.add(handlePrevNextPictureButton, this, 0, true);
        prevPictureText.visible = false;

        var nextPictureText;
        if (useBitmapFont) {
            nextPictureText = game.add.bitmapText(axisWidth * 3 + 1024, axisWidth * 3 + 512 / 2, '04b_03-pink', '>', 48, hud);
            nextPictureText.anchor.set(0.5, 0.5);
            nextPictureText.hitArea = new Phaser.Rectangle(-axisWidth, -30, axisWidth * 2, 60);
        } else {
            nextPictureText = game.add.text(axisWidth * 2 + 1024, axisWidth * 3 + 512 / 2 - 30, '>', hudTextStyleBig);
            nextPictureText.setTextBounds(0, 0, axisWidth * 2, 60);
            var nextPictureTextBounds = nextPictureText.getBounds();
            nextPictureText.hitArea = new Phaser.Rectangle((nextPictureTextBounds.width - axisWidth * 2) / 2, (nextPictureTextBounds.height - 60) / 2, axisWidth * 2, 60);
            hud.add(restartLevelText);
        }
        nextPictureText.inputEnabled = true;
        nextPictureText.input.useHandCursor = true;
        nextPictureText.events.onInputUp.add(handlePrevNextPictureButton, this, 0, false);
        nextPictureText.visible = false;
    }

    function updateActionsCounter() {
        hud.getAt(0).text = 'Actions: ' + (++actionsCounter);
    }

    function calcMinActions() {
        minActions = 0;

        var i;
        var i2;
        var initialConfig;
        var done = false;
        var axesState = axes.children.map(function (axis) {
            return {
                isRepeated: axis.isRepeated,
                isHorizontal: axis.isHorizontal,
                isForward: axis.isForward
            };
        });
        while (!done) {
            done = true;
            for (i = 0; i < axesCount; ++i) {
                initialConfig = getAxisInitialConfig(i);
                if (
                    axesState[i].isRepeated === initialConfig.isRepeated &&
                    axesState[i].isHorizontal === initialConfig.isHorizontal
                ) {
                    continue;
                }

                done = false;
                i2 = getAxisIndexByInitialConfig(axesState[i]);
                minActions += 1;
                initialConfig.isRepeated = axesState[i2].isRepeated;
                initialConfig.isHorizontal = axesState[i2].isHorizontal;
                axesState[i2].isRepeated = axesState[i].isRepeated;
                axesState[i2].isHorizontal = axesState[i].isHorizontal;
                axesState[i].isRepeated = initialConfig.isRepeated;
                axesState[i].isHorizontal = initialConfig.isHorizontal;
            }
        }
        for (i = 0; i < axesCount; ++i) {
            if (!axesState[i].isForward) {
                minActions += 1;
                axesState[i].isForward = true;
            }
        }

        hud.getAt(3).text = 'Min Actions: ' + minActions;
    }

    function shuffleAxes() {
        shuffling = true;
        //axes.visible = false;
        //cells.visible = false;
        for (
            var i = 0;
            i < axesCount * 2 || getTotalDistanceFromInitialConfig() < axesCount || getAxisDistanceFromInitialConfig(0) === 0 || getAxisDistanceFromInitialConfig(horizontalAxesCount) === 0;
            ++i
        ) {
            axisDown = axes.getAt(Math.floor(Math.random() * axesCount));
            axisOver = axes.getAt(Math.floor(Math.random() * axesCount));
            onUp();
        }
        //axes.visible = true;
        //cells.visible = true;
        shuffling = false;
    }

    function introAnimation() {
        var i;
        for (i = 0; i < totalCellsCount; ++i) {
            var cell = cellsArray[i];
            var delay = 1000 * (horizontalCellsCount > verticalCellsCount ? 2 : 1) * ((cell.x / cellSize) + (cell.y / cellSize) * verticalCellsCount) / totalCellsCount;
            game.add.tween(cell).from({
                x: cell.x * 4 - (horizontalAxesCount === verticalAxesCount ? 256 : 512),
                y: cell.y * 3 - 256,
                rotation: Math.PI * Math.random() * 4 - Math.PI * 2
            }, tweenDuration, 'Elastic', true, delay);
            game.add.tween(cell.scale).from({
                x: cell.scale.x * 3,
                y: cell.scale.y * 3
            }, tweenDuration, 'Elastic', true, delay);
        }
        for (i = 0; i < axesCount; ++i) {
            var axis = axes.getAt(i);
            if (axis.isHorizontal) {
                if (Math.log(axis.isRepeated) / Math.LN2 < topAxesCount) {
                    game.add.tween(axis).from({
                        x: axis.x - 1144
                    }, tweenDuration, 'Elastic', true, 1500);
                } else {
                    game.add.tween(axis).from({
                        x: axis.x + 1144
                    }, tweenDuration, 'Elastic', true, 1550);
                }
            } else {
                if (Math.log(axis.isRepeated) / Math.LN2 < leftAxesCount) {
                    game.add.tween(axis).from({
                        y: axis.y + 662
                    }, tweenDuration, 'Elastic', true, 1600);
                } else {
                    game.add.tween(axis).from({
                        y: axis.y - 662
                    }, tweenDuration, 'Elastic', true, 1650);
                }
            }
        }
    }

    function create () {
        moveTween = game.make.tween({}).to({}, tweenDuration, tweenEase);
        moveTween.onUpdateCallback(handleMoveTweenUpdate);
        moveTween.onComplete.add(handleMoveTweenUpdate);

        createCells();
        createAxes();
        createHud();
        shuffleAxes();
        calcMinActions();

        introAnimation();

        timerStarted = Date.now() + 3000;
        game.time.events.loop(1000, updateTimer);
    }

    function checkSolved() {
        if (getTotalDistanceFromInitialConfig() === 0) {
            solved = true;

            localStorage.setItem('deshgramRollerSolvedAxesCount', String(axesCount));

            var solvedPictures = localStorage.getItem('deshgramRollerSolvedPictures');
            solvedPictures = solvedPictures === null ? [] : solvedPictures.split('|');
            var currentPictureIndex = solvedPictures.indexOf(pictureUrl);
            if (solvedPictures.indexOf(pictureUrl) >= 0) {
                solvedPictures.splice(currentPictureIndex, 1);
            }
            currentPictureIndex = solvedPictures.length;
            if (!maze) {
                solvedPictures.push(pictureUrl);
                localStorage.setItem('deshgramRollerSolvedPictures', solvedPictures.join('|'));
            }

            game.add.tween(axes).to({ alpha: 0 }, tweenDuration, 'Linear', true)
                .onComplete.addOnce(function (target) { target.visible = false; }, this);
            hud.getAt(1).visible = true;
            hud.getAt(2).visible = true;
            hud.getAt(3).visible = true;
            hud.getAt(5).visible = true;
            if (currentPictureIndex > 0) {
                hud.getAt(6).visible = true;
            }
            if (currentPictureIndex < solvedPictures.length - 1) {
                hud.getAt(7).visible = true;
            }
        }
    }

    function updateTimer() {
        if (solved) {
            return;
        }
        var elapsed = game.time.elapsedSecondsSince(timerStarted);
        if (elapsed < 0) {
            hud.getAt(4).text = '00:00';
        } else {
            var mins = Math.floor(elapsed / 60);
            var secs = Math.floor(elapsed) - (mins * 60);
            hud.getAt(4).text = (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs);
        }
    }
};

function GroupNineSlice(game, parent, name, data) {
    Phaser.Group.call(this, game, parent, name);

    this.inputEnableChildren = data.inputEnableChildren || false;

    this.topLeftPart = game.add.image(0, 0, data.key, data.topLeftFrame, this);
    this.topCenterPart = game.add.image(this.topLeftPart.width, 0, data.key, data.topCenterFrame, this);
    this.topRightPart = game.add.image(this.topLeftPart.width + this.topCenterPart.width, 0, data.key, data.topRightFrame, this);
    this.middleLeftPart = game.add.image(0, this.topLeftPart.height, data.key, data.middleLeftFrame, this);
    this.middleCenterPart = game.add.image(this.topLeftPart.width, this.topLeftPart.height, data.key, data.middleCenterFrame, this);
    this.middleRightPart = game.add.image(this.topLeftPart.width + this.topCenterPart.width, this.topLeftPart.height, data.key, data.middleRightFrame, this);
    this.bottomLeftPart = game.add.image(0, this.topLeftPart.height + this.middleLeftPart.height, data.key, data.bottomLeftFrame, this);
    this.bottomCenterPart = game.add.image(this.topLeftPart.width, this.topLeftPart.height + this.middleLeftPart.height, data.key, data.bottomCenterFrame, this);
    this.bottomRightPart = game.add.image(this.topLeftPart.width + this.topCenterPart.width, this.topLeftPart.height + this.middleLeftPart.height, data.key, data.bottomRightFrame, this);

    if (this.inputEnableChildren && data.useHandCursor) {
        this.children.forEach(function (child) {
            child.input.useHandCursor = true;
        });
    }

    if (this.inputEnableChildren && data.propagateEvents) {
        this.onChildInputDown.add(function (_, pointer) {
            if (this.parent && this.parent.onChildInputDown) {
                this.parent.onChildInputDown.dispatch(this, pointer);
            }
        }, this);
        this.onChildInputOver.add(function (_, pointer) {
            if (this.parent && this.parent.onChildInputOver) {
                this.parent.onChildInputOver.dispatch(this, pointer);
            }
        }, this);
        this.onChildInputOut.add(function (_, pointer) {
            if (this.parent && this.parent.onChildInputOut) {
                this.parent.onChildInputOut.dispatch(this, pointer);
            }
        }, this);
        this.onChildInputUp.add(function (_, pointer) {
            if (this.parent && this.parent.onChildInputUp) {
                this.parent.onChildInputUp.dispatch(this, pointer);
            }
        }, this);
    }

    this.localWidth = this.topLeftPart.width + this.topCenterPart.width + this.topRightPart.width;
    this.localHeight = this.topLeftPart.height + this.middleLeftPart.height + this.bottomLeftPart.height;
}

GroupNineSlice.prototype = Object.create(Phaser.Group.prototype);
GroupNineSlice.prototype.constructor = GroupNineSlice;

GroupNineSlice.prototype.renderTexture = function () {
    var centerWidth = this.localWidth - this.topLeftPart.width - this.topRightPart.width;
    this.topCenterPart.width = centerWidth;
    this.middleCenterPart.width = centerWidth;
    this.bottomCenterPart.width = centerWidth;

    var rightX = this.topLeftPart.width + centerWidth;
    this.topRightPart.x = rightX;
    this.middleRightPart.x = rightX;
    this.bottomRightPart.x = rightX;

    var middleHeight = this.localHeight - this.topLeftPart.height - this.bottomLeftPart.height;
    this.middleLeftPart.height = middleHeight;
    this.middleCenterPart.height = middleHeight;
    this.middleRightPart.height = middleHeight;

    var bottomY = this.topLeftPart.height + middleHeight;
    this.bottomLeftPart.y = bottomY;
    this.bottomCenterPart.y = bottomY;
    this.bottomRightPart.y = bottomY;
};

GroupNineSlice.prototype.resize = function (width, height) {
    this.localWidth = width;
    this.localHeight = height;

    this.renderTexture();
};

