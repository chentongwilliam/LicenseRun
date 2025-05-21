<template>
  <div class="game-container">
    <!-- 游戏场景将在这里渲染 -->
    <div id="game-canvas"></div>
    
    <!-- HUD界面 -->
    <div class="hud">
      <div class="speed">速度: {{ speed }} km/h</div>
      <div class="steering">转向角度: {{ steeringAngle }}°</div>
      <div class="joystick">摇杆: X:{{ joystickX.toFixed(2) }} Y:{{ joystickY.toFixed(2) }}</div>
      <div class="steer-value">转向值: {{ steerValue.toFixed(2) }}</div>
      <div class="fps">FPS: {{ fps }}</div>
      <div class="score">分数: {{ score }}</div>
    </div>
    
    <!-- 移动端控制界面 -->
    <div class="mobile-controls" v-if="isMobile">
      <div id="joystick"></div>
      <div class="turn-signals">
        <button @click="toggleLeftSignal" :class="{ active: leftSignal }">左转</button>
        <button @click="toggleRightSignal" :class="{ active: rightSignal }">右转</button>
      </div>
      <!-- 添加视角控制按钮 -->
      <div class="camera-controls">
        <button @click="rotateCameraLeft">←</button>
        <button @click="rotateCameraRight">→</button>
        <button @click="zoomCameraIn">+</button>
        <button @click="zoomCameraOut">-</button>
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
const steeringAngle = ref(0)
const fps = ref(0)
const joystickX = ref(0)
const joystickY = ref(0)
const steerValue = ref(0)

// 游戏场景实例
let gameScene = null
let joystick = null
let frameCount = 0
let lastFpsUpdate = performance.now()

// 定时刷新速度显示
let speedInterval = null;

// 检测设备类型
const checkDevice = () => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 视角控制方法
const rotateCameraLeft = () => {
  if (gameScene) {
    gameScene.orbit.theta -= Math.PI / 6 // 旋转30度
  }
}

const rotateCameraRight = () => {
  if (gameScene) {
    gameScene.orbit.theta += Math.PI / 6 // 旋转30度
  }
}

const rotateCameraUp = () => {
  if (gameScene) {
    gameScene.orbit.phi = Math.max(10 * Math.PI / 180, gameScene.orbit.phi - Math.PI / 6) // 向上旋转30度，最小10度
  }
}

const rotateCameraDown = () => {
  if (gameScene) {
    gameScene.orbit.phi = Math.min(80 * Math.PI / 180, gameScene.orbit.phi + Math.PI / 6) // 向下旋转30度，最大80度
  }
}

const zoomCameraIn = () => {
  if (gameScene) {
    gameScene.orbit.radius = Math.max(5, gameScene.orbit.radius * 0.8) // 缩小20%，最小距离5
  }
}

const zoomCameraOut = () => {
  if (gameScene) {
    gameScene.orbit.radius = Math.min(30, gameScene.orbit.radius * 1.2) // 放大20%，最大距离30
  }
}

// 初始化虚拟摇杆
const initJoystick = () => {
  if (!isMobile.value) return
  
  // 确保DOM元素已经存在
  const joystickElement = document.getElementById('joystick')
  if (!joystickElement) {
    console.error('Joystick element not found')
    return
  }

  // 销毁已存在的摇杆
  if (joystick) {
    joystick.destroy()
  }
  
  joystick = nipplejs.create({
    zone: joystickElement,
    mode: 'static',
    position: { left: '50%', bottom: '50%' },
    color: 'white',
    size: 120,
    threshold: 0.1,
    fadeTime: 250,
    lockX: false,
    lockY: false,
    dynamicPage: true,
    restOpacity: 0.5,
    restJoystick: true
  })

  // 存储当前摇杆状态
  let currentJoystickState = {
    x: 0,
    y: 0,
    active: false
  }
  
  // 摇杆事件处理
  joystick.on('move', (evt, data) => {
    currentJoystickState = {
      x: data.vector.x,
      y: data.vector.y,
      active: true
    }
    joystickX.value = data.vector.x
    joystickY.value = data.vector.y
  })
  
  joystick.on('end', () => {
    currentJoystickState = {
      x: 0,
      y: 0,
      active: false
    }
    joystickX.value = 0
    joystickY.value = 0
  })

  // 使用 requestAnimationFrame 持续更新车辆状态
  let animationFrameId = null
  let lastUpdateTime = performance.now()
  
  const updateVehicleState = () => {
    if (!gameScene || !gameScene.simpleCar) return
    
    const currentTime = performance.now()
    const deltaTime = (currentTime - lastUpdateTime) / 1000 // 转换为秒
    lastUpdateTime = currentTime
    
    // 更新FPS
    frameCount++
    if (currentTime - lastFpsUpdate >= 1000) {
      fps.value = frameCount
      frameCount = 0
      lastFpsUpdate = currentTime
    }
    
    if (currentJoystickState.active) {
      const { x, y } = currentJoystickState
      
      // 处理转向（左右）- 使用平滑的映射函数
      if (Math.abs(x) < 0.2) {
        // 在死区内，不进行转向
        gameScene.simpleCar.setSteering(0)
      } else {
        // 超出死区，进行转向
        let newSteerValue = Math.min(gameScene.simpleCar.steeringAngle + (-x) * 0.005, Math.PI / 4) // 反转x轴方向，使左右转向正确
        steerValue.value = newSteerValue
        gameScene.simpleCar.setSteering(newSteerValue)
      }
      
      // 处理油门和刹车（前后）- 使用平滑的映射函数
      let throttleValue = 0
      if (y < 0) {
        // 前进（y为负值）- 使用二次函数使加速更平滑
        throttleValue = -Math.pow(Math.abs(y), 1.5) * 4.0
      } else {
        // 后退（y为正值）- 使用二次函数使减速更平滑
        throttleValue = Math.pow(y, 1.5) * 4.0
      }
      
      // 应用油门值
      gameScene.simpleCar.setWheelRotation(throttleValue)
      
      // 更新速度显示（km/h）
      const speedKmh = Math.abs(Math.round(gameScene.simpleCar.getSpeedKmh()))
      speed.value = speedKmh
    } else {
      // 摇杆未激活时，逐渐停止车辆
      gameScene.simpleCar.setSteering(0)
      gameScene.simpleCar.setWheelRotation(0)
      speed.value = Math.abs(Math.round(gameScene.simpleCar.getSpeedKmh()))
    }
    
    // 继续下一帧更新
    animationFrameId = requestAnimationFrame(updateVehicleState)
  }
  
  // 开始更新循环
  updateVehicleState()
  
  // 在组件卸载时清理
  onUnmounted(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
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
  if (!gameScene || !gameScene.simpleCar) {
    console.log('Game scene or car not initialized')
    return
  }
  // key event in gameScene
}

const handleKeyUp = (event) => {
  if (!gameScene || !gameScene.simpleCar) {
    console.log('Game scene or car not initialized')
    return
  }
  // key event in gameScene
}

// 初始化游戏场景
const initGameScene = () => {
  const container = document.getElementById('game-canvas')
  console.log('Initializing game scene')
  gameScene = new GameScene(container)
  
  // 每帧刷新速度显示
  if (speedInterval) clearInterval(speedInterval)
  speedInterval = setInterval(() => {
    if (gameScene && gameScene.simpleCar) {
      // 速度带正负，倒车为负
      const v = gameScene.simpleCar.speed * 3.6
      const roundedSpeed = Math.round(v)
      if (roundedSpeed !== speed.value) {
        // console.log('Speed updated:', roundedSpeed, 'km/h')
        speed.value = roundedSpeed
      }
      // 更新转向角度显示
      const angle = Math.round(gameScene.simpleCar.steeringAngle * 180 / Math.PI)
      steeringAngle.value = angle
    }
  }, 50)
}

// 生命周期钩子
onMounted(() => {
  console.log('Component mounted')
  checkDevice()
  initGameScene()
  
  // 延迟初始化摇杆，确保DOM已经渲染
  setTimeout(() => {
    console.log('Initializing joystick')
    initJoystick()
  }, 100)
  
  // 添加键盘事件监听
  console.log('Adding keyboard event listeners')
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

// 在窗口大小改变时重新初始化摇杆
window.addEventListener('resize', () => {
  if (isMobile.value) {
    initJoystick()
  }
})

onUnmounted(() => {
  console.log('Component unmounting')
  if (gameScene) {
    console.log('Disposing game scene')
    gameScene.dispose()
  }
  if (speedInterval) {
    console.log('Clearing speed interval')
    clearInterval(speedInterval)
  }
  // 移除键盘事件监听
  console.log('Removing keyboard event listeners')
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  // 清理摇杆
  if (joystick) {
    console.log('Destroying joystick')
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 10px;
  backdrop-filter: blur(5px);
}

.hud > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hud .speed::before {
  content: "🚗";
}

.hud .steering::before {
  content: "🔄";
}

.hud .fps::before {
  content: "⚡";
}

.hud .score::before {
  content: "🏆";
}

/* 移动端样式调整 */
@media screen and (max-width: 768px) {
  .hud {
    top: 10px;
    left: 10px;
    font-size: 12px;
    padding: 8px;
    gap: 5px;
  }

  .hud > div {
    gap: 5px;
  }

  /* 调整图标大小 */
  .hud .speed::before,
  .hud .steering::before,
  .hud .fps::before,
  .hud .score::before {
    font-size: 8px;
  }
}

/* 小屏幕手机样式调整 */
@media screen and (max-width: 360px) {
  .hud {
    font-size: 8px;
    padding: 6px;
  }

  .hud > div {
    gap: 4px;
  }

  /* 调整图标大小 */
  .hud .speed::before,
  .hud .steering::before,
  .hud .fps::before,
  .hud .score::before {
    font-size: 8px;
  }
}

.mobile-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40%;
  z-index: 10;
  pointer-events: none; /* 允许点击穿透到游戏场景 */
}

#joystick {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  pointer-events: auto; /* 恢复摇杆的点击事件 */
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

/* 添加摇杆手柄样式 */
.nipple {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 2px solid rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3) !important;
}

/* 添加视角控制按钮 */
.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 25px;
  backdrop-filter: blur(5px);
}

.camera-controls button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.camera-controls button:active {
  background: rgba(255, 255, 255, 0.5);
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