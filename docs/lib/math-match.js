/*
 * math-match, version: 0.0.1
 * Copyright (c) 2016 Aerobird98, All rights reserved
 * Released under the MIT License
 */

// Specify the Input Manager (...both keyboard & touch events)
function KeyboardInputManager () {
  this.events = {}
  this.eventTouchstart = 'touchstart'
  this.eventTouchmove = 'touchmove'
  this.eventTouchend = 'touchend'

  this.listen()
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = []
  }
  this.events[event].push(callback)
}

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event]
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data)
    })
  }
}

KeyboardInputManager.prototype.listen = function () {
  var self = this

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // Vim up
    76: 1, // Vim right
    74: 2, // Vim down
    72: 3, // Vim left
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3  // A
  }

  // Respond to direction keys
  document.addEventListener('keydown', function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey
    var mapped = map[event.which]

    // Ignore the event if it's happening in a text field
    if (self.targetIsInput(event)) return

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault()
        self.emit('move', mapped)
      }
    }

    // R key restarts the game
    if (!modifiers && event.which === 82) {
      // It is a rough solution for standard's "useless '.call()'." rule, but it's working
      var itself = self
      self.restart.call(itself, event)
    }
  })

  // Respond to button presses
  this.bindButtonPress('.retry', this.restart)

  // Respond to swipe events
  var touchStartClientX, touchStartClientY
  var container = document.getElementsByClassName('container')[0]

  container.addEventListener(this.eventTouchstart, function (event) {
    if (event.touches.length > 1 ||
        event.targetTouches.length > 1 ||
        self.targetIsInput(event)) {
      return // Ignore if touching with more than 1 finger or touching input
    }

    touchStartClientX = event.touches[0].clientX
    touchStartClientY = event.touches[0].clientY

    event.preventDefault()
  })

  container.addEventListener(this.eventTouchmove, function (event) {
    event.preventDefault()
  })

  container.addEventListener(this.eventTouchend, function (event) {
    if (event.touches.length > 0 ||
        event.targetTouches.length > 0 ||
        self.targetIsInput(event)) {
      return // Ignore if still touching with one or more fingers or input
    }

    var touchEndClientX, touchEndClientY

    touchEndClientX = event.changedTouches[0].clientX
    touchEndClientY = event.changedTouches[0].clientY

    var dx = touchEndClientX - touchStartClientX
    var absDx = Math.abs(dx)

    var dy = touchEndClientY - touchStartClientY
    var absDy = Math.abs(dy)

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit('move', absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0))
    }
  })
}

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault()
  this.emit('restart')
}

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector)
  button.addEventListener('click', fn.bind(this))
  button.addEventListener(this.eventTouchend, fn.bind(this))
}

KeyboardInputManager.prototype.targetIsInput = function (event) {
  return event.target.tagName.toLowerCase() === 'input'
}

// Specify the HTML Operator
function HTMLOperator () {
  this.numberContainer = document.querySelector('.number-container')
  this.scoreContainer = document.querySelector('.score-container')
  this.bestContainer = document.querySelector('.best-container')
  this.messageContainer = document.querySelector('.message')

  this.score = 0
}

HTMLOperator.prototype.operate = function (grid, metadata) {
  var self = this

  window.requestAnimationFrame(function () {
    self.clearContainer(self.numberContainer)

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addNumberXY(cell)
        }
      })
    })

    self.updateScore(metadata.score)
    self.updateBestScore(metadata.bestScore)

    if (metadata.terminated) {
      if (metadata.lose) {
        self.message(false) // You lose
      }
    }
  })
}

HTMLOperator.prototype.retry = function () {
  var ga
  if (typeof ga !== 'undefined') {
    ga('send', 'event', 'game', 'restart')
  }

  this.clearMessage()
}

HTMLOperator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
}

HTMLOperator.prototype.addNumberXY = function (number) {
  var self = this

  var wrapper = document.createElement('div')
  var inner = document.createElement('div')
  var position = number.previousPosition || { x: number.x, y: number.y }
  var positionClass = this.positionClass(position)

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ['number', 'number-' + number.value, positionClass]

  this.applyClasses(wrapper, classes)

  inner.classList.add('number-inner')
  inner.textContent = number.value

  if (number.previousPosition) {
    // Make sure that the number gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: number.x, y: number.y })
      self.applyClasses(wrapper, classes) // Update the position
    })
  } else if (number.mergedFrom) {
    classes.push('number-merged')
    this.applyClasses(wrapper, classes)

    // Render the numbers that merged
    number.mergedFrom.forEach(function (merged) {
      self.addNumberXY(merged)
    })
  } else {
    classes.push('number-new')
    this.applyClasses(wrapper, classes)
  }

  // Add the inner part of the number to the wrapper
  wrapper.appendChild(inner)

  // Put the number on the board
  this.numberContainer.appendChild(wrapper)
}

HTMLOperator.prototype.applyClasses = function (element, classes) {
  element.setAttribute('class', classes.join(' '))
}

HTMLOperator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 }
}

HTMLOperator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position)
  return 'number-position-' + position.x + '-' + position.y
}

HTMLOperator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer)
  this.scoreContainer.textContent = score
}

HTMLOperator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore
}

HTMLOperator.prototype.message = function () {
  var lose = 'lose'
  var message = 'Game Over!'
  var ga

  if (typeof ga !== 'undefined') {
    ga('send', 'event', 'game', 'end', lose, this.score)
  }

  this.messageContainer.classList.add(lose)
  this.messageContainer.getElementsByTagName('p')[0].textContent = message
}

HTMLOperator.prototype.clearMessage = function () {
  this.messageContainer.classList.remove('lose')
}

// Specify the Grid (Actualy this is the gameboard)
function Grid (size, previousState) {
  this.size = size
  this.cells = previousState ? this.fromState(previousState) : this.empty()
}

// Build an empty grid of the specified size
Grid.prototype.empty = function () {
  var cells = []

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = []

    for (var y = 0; y < this.size; y++) {
      row.push(null)
    }
  }

  return cells
}

Grid.prototype.fromState = function (state) {
  var cells = []

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = []

    for (var y = 0; y < this.size; y++) {
      var number = state[x][y]
      row.push(number ? new NumberXY(number.position, number.value) : null)
    }
  }

  return cells
}

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells()

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)]
  }
}

// Find available empty cells
Grid.prototype.availableCells = function () {
  var cells = []

  this.eachCell(function (x, y, number) {
    if (!number) {
      cells.push({ x: x, y: y })
    }
  })

  return cells
}

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y])
    }
  }
}

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length
}

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell)
}

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell)
}

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y]
  } else {
    return null
  }
}

// Inserts a number at its position
Grid.prototype.insertNumberXY = function (number) {
  this.cells[number.x][number.y] = number
}

// Remove a number at its position
Grid.prototype.removeNumberXY = function (number) {
  this.cells[number.x][number.y] = null
}

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size
}

Grid.prototype.serialize = function () {
  var cellState = []

  for (var x = 0; x < this.size; x++) {
    var row = cellState[x] = []

    for (var y = 0; y < this.size; y++) {
      row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null)
    }
  }

  return {
    size: this.size,
    cells: cellState
  }
}

// Specify the Number (XY is means, it's a number with an x and y coordinates)
function NumberXY (position, value) {
  this.x = position.x
  this.y = position.y
  this.value = value || 2

  this.previousPosition = null
  this.mergedFrom = null // Tracks numbers that merged together
}

// Save the number position
NumberXY.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y }
}

// Update the number position
NumberXY.prototype.updatePosition = function (position) {
  this.x = position.x
  this.y = position.y
}

// Serialize the numbers
NumberXY.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value
  }
}

// Specify the Local Storage Manager
function LocalStorageManager () {
  this.bestScoreKey = 'bestScore'
  this.gameStateKey = 'gameState'

  this.storage = window.localStorage
}

// Get the score (Best)
LocalStorageManager.prototype.getBestScore = function () {
  return this.storage.getItem(this.bestScoreKey) || 0
}

// Set the score (Best)
LocalStorageManager.prototype.setBestScore = function (score) {
  this.storage.setItem(this.bestScoreKey, score)
}

// Get the actual game state
LocalStorageManager.prototype.getGameState = function () {
  var stateJSON = this.storage.getItem(this.gameStateKey)
  return stateJSON ? JSON.parse(stateJSON) : null
}

// Set the actual game state
LocalStorageManager.prototype.setGameState = function (gameState) {
  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState))
}

// Clear the actual game state
LocalStorageManager.prototype.clearGameState = function () {
  this.storage.removeItem(this.gameStateKey)
}

// Specify the Game Manager (...and use all we got so far)
function GameManager (size, InputManager, Operator, StorageManager) {
  this.size = size // Size of the grid (e.g.: 4 is equals 4x4)
  this.inputManager = new InputManager()
  this.storageManager = new StorageManager()
  this.operator = new Operator()

  this.startNumberXY = 2

  this.inputManager.on('move', this.move.bind(this))
  this.inputManager.on('restart', this.restart.bind(this))

  this.setup()
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState()
  this.operator.retry() // Clear message
  this.setup()
}

// Return true if the game is lost
GameManager.prototype.isGameTerminated = function () {
  return this.lose
}

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState()

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid = new Grid(previousState.grid.size,
                                previousState.grid.cells) // Reload grid
    this.score = previousState.score
    this.lose = previousState.lose
  } else {
    this.grid = new Grid(this.size)
    this.score = 0
    this.lose = false

    // Add the initial numbers
    this.addStartNumberXY()
  }

  // Update the operator
  this.operate()
}

// Set up the initial numbers to start the game with
GameManager.prototype.addStartNumberXY = function () {
  for (var i = 0; i < this.startNumberXY; i++) {
    this.addRandomNumberXY()
  }
}

// Adds a number in a random position
GameManager.prototype.addRandomNumberXY = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4
    var number = new NumberXY(this.grid.randomAvailableCell(), value)

    this.grid.insertNumberXY(number)
  }
}

// Sends the updated grid to the operator
GameManager.prototype.operate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score)
  }

  // Clear the state when the game is lose
  if (this.lose) {
    this.storageManager.clearGameState()
  } else {
    this.storageManager.setGameState(this.serialize())
  }

  this.operator.operate(this.grid, {
    score: this.score,
    lose: this.lose,
    bestScore: this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  })
}

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid: this.grid.serialize(),
    score: this.score,
    lose: this.lose
  }
}

// Save all number positions and remove merger info
GameManager.prototype.prepareNumberXY = function () {
  this.grid.eachCell(function (x, y, number) {
    if (number) {
      number.mergedFrom = null
      number.savePosition()
    }
  })
}

// Move a number and its representation
GameManager.prototype.moveNumberXY = function (number, cell) {
  this.grid.cells[number.x][number.y] = null
  this.grid.cells[cell.x][cell.y] = number
  number.updatePosition(cell)
}

// Move numbers on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this

  if (this.isGameTerminated()) return // Don't do anything if the game's lose

  var cell, number

  var vector = this.getVector(direction)
  var traversals = this.buildTraversals(vector)
  var moved = false

  // Save the current number positions and remove merger information
  this.prepareNumberXY()

  // Traverse the grid in the right direction and move numbers
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y }
      number = self.grid.cellContent(cell)

      if (number) {
        var positions = self.findFarthestPosition(cell, vector)
        var next = self.grid.cellContent(positions.next)

        // Only one merger per row traversal?
        if (next && next.value === number.value && !next.mergedFrom) {
          var merged = new NumberXY(positions.next, number.value * 2)
          merged.mergedFrom = [number, next]

          self.grid.insertNumberXY(merged)
          self.grid.removeNumberXY(number)

          // Converge the two numbers' positions
          number.updatePosition(positions.next)

          // Update the score
          self.score += merged.value
        } else {
          self.moveNumberXY(number, positions.farthest)
        }
        if (!self.positionsEqual(cell, number)) {
          moved = true // The number moved from its original cell!
        }
      }
    })
  })

  if (moved) {
    this.addRandomNumberXY()

    if (!this.movesAvailable()) {
      this.lose = true // lose!
    }

    this.operate()
  }
}

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing number movement
  var map = {
    0: { x: 0, y: -1 }, // Up
    1: { x: 1, y: 0 },  // Right
    2: { x: 0, y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  }

  return map[direction]
}

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] }

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos)
    traversals.y.push(pos)
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse()
  if (vector.y === 1) traversals.y = traversals.y.reverse()

  return traversals
}

// Get the farthest position
GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell
    cell = { x: previous.x + vector.x, y: previous.y + vector.y }
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell))

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  }
}

// Check for available matches between numbers
GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.numberMatchesAvailable()
}

// Check for available matches between numbers (more expensive check)
GameManager.prototype.numberMatchesAvailable = function () {
  var self = this

  var number

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      number = this.grid.cellContent({ x: x, y: y })

      if (number) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction)
          var cell = { x: x + vector.x, y: y + vector.y }

          var other = self.grid.cellContent(cell)

          if (other && other.value === number.value) {
            return true // These two numbers can be merged
          }
        }
      }
    }
  }

  return false
}

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y
}
