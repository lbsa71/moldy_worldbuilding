(module
 (type $0 (func (param i32 i32) (result i32)))
 (type $1 (func (param f32 f32 f32) (result f32)))
 (global $~lib/memory/__data_end i32 (i32.const 8))
 (global $~lib/memory/__stack_pointer (mut i32) (i32.const 32776))
 (global $~lib/memory/__heap_base i32 (i32.const 32776))
 (memory $0 0)
 (table $0 1 1 funcref)
 (elem $0 (i32.const 1))
 (export "add" (func $assembly/index/add))
 (export "calculatePhysics" (func $assembly/gameLogic/calculatePhysics))
 (export "memory" (memory $0))
 (func $assembly/index/add (param $a i32) (param $b i32) (result i32)
  local.get $a
  local.get $b
  i32.add
  return
 )
 (func $assembly/gameLogic/calculatePhysics (param $x f32) (param $y f32) (param $z f32) (result f32)
  local.get $x
  local.get $x
  f32.mul
  local.get $y
  local.get $y
  f32.mul
  f32.add
  local.get $z
  local.get $z
  f32.mul
  f32.add
  return
 )
)
