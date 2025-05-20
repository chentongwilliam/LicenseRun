<template>
  <div class="game-container">
    <!-- 游戏场景将在这里渲染 -->
    <div id="game-canvas"></div>
    
    <!-- HUD界面 -->
    <div class="hud">
      <div class="speed">速度: {{ speed }} km/h</div>
      <div class="score">分数: {{ score }}</div>
    </div>
    
    <!-- 移动端控制界面 -->
    <div class="mobile-controls" v-if="isMobile">
      <div id="joystick"></div>
      <div class="turn-signals">
        <button @click="toggleLeftSignal" :class="{ active: leftSignal }">左转</button>
        <button @click="toggleRightSignal" :class="{ active: rightSignal }">右转</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import nipplejs from 'nipplejs'
import { GameScene } from './core/scene/GameScene'

// 游戏状态
const speed = ref(0)
const score = ref(0)
const leftSignal = ref(false)
const rightSignal = ref(false)
const isMobile = ref(false)

// 游戏场景实例
let gameScene = null
let joystick = null

// 定时刷新速度显示
let speedInterval = null;

// 检测设备类型
const checkDevice = () => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 初始化虚拟摇杆
const initJoystick = () => {
  if (!isMobile.value) return
  
  joystick = nipplejs.create({
    zone: document.getElementById('joystick'),
    mode: 'static',
    position: { left: '50%', bottom: '50%' },
    color: 'white'
  })
  
  // 摇杆事件处理
  joystick.on('move', (evt, data) => {
    if (gameScene && gameScene.simpleCar) {
      // 处理转向
      const steerValue = data.vector.x * Math.PI / 4 // 最大转向角度为45度
      gameScene.simpleCar.setSteering(steerValue)
      
      // 处理轮子旋转
      const wheelRotation = data.vector.y * 5.0 // 最大旋转速度
      gameScene.simpleCar.setWheelRotation(wheelRotation)
      
      // 更新速度显示
      speed.value = Math.abs(Math.round(wheelRotation * 20)) // 简单的速度计算
    }
  })
  
  joystick.on('end', () => {
    if (gameScene && gameScene.simpleCar) {
      // 停止车辆
      gameScene.simpleCar.setSteering(0)
      gameScene.simpleCar.setWheelRotation(0)
      speed.value = 0
    }
  })
}

// 转向灯控制
const toggleLeftSignal = () => {
  leftSignal.value = !leftSignal.value
  if (leftSignal.value) rightSignal.value = false
}

const toggleRightSignal = () => {
  rightSignal.value = !rightSignal.value
  if (rightSignal.value) leftSignal.value = false
}

// 键盘控制
const handleKeyDown = (event) => {
  if (!gameScene || !gameScene.simpleCar) return
  
  switch (event.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      gameScene.simpleCar.setWheelRotation(5.0)
      break
    case 's':
    case 'arrowdown':
      gameScene.simpleCar.setWheelRotation(-5.0)
      break
    case 'a':
    case 'arrowleft':
      gameScene.simpleCar.setSteering(Math.PI / 4)
      break
    case 'd':
    case 'arrowright':
      gameScene.simpleCar.setSteering(-Math.PI / 4)
      break
  }
}

const handleKeyUp = (event) => {
  if (!gameScene || !gameScene.simpleCar) return
  
  switch (event.key.toLowerCase()) {
    case 'w':
    case 's':
    case 'arrowup':
    case 'arrowdown':
      gameScene.simpleCar.setWheelRotation(0)
      break
    case 'a':
    case 'd':
    case 'arrowleft':
    case 'arrowright':
      gameScene.simpleCar.setSteering(0)
      break
  }
}

// 初始化游戏场景
const initGameScene = () => {
  const container = document.getElementById('game-canvas')
  gameScene = new GameScene(container)
  // 每帧刷新速度显示
  if (speedInterval) clearInterval(speedInterval);
  speedInterval = setInterval(() => {
    if (gameScene && gameScene.simpleCar) {
      // 速度带正负，倒车为负
      const v = gameScene.simpleCar.speed * 3.6;
      speed.value = Math.round(v);
    }
  }, 50);
}

// 生命周期钩子
onMounted(() => {
  checkDevice()
  initGameScene()
  initJoystick()
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  if (gameScene) {
    gameScene.dispose()
  }
  if (speedInterval) clearInterval(speedInterval);
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  // 清理摇杆
  if (joystick) {
    joystick.destroy()
  }
})
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#game-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.hud {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 24px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.mobile-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40%;
  z-index: 10;
}

#joystick {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 150px;
}

.turn-signals {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.turn-signals button {
  padding: 10px 20px;
  font-size: 18px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
}

.turn-signals button.active {
  background: rgba(255, 255, 255, 0.6);
}
</style> 