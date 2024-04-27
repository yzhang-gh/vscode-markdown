//just referencing the crate will include the slugify function in the wasm bundle
// we don't need to manually expose it since the crate does it for us;
#[allow(unused_imports)]
use slug;

#[cfg(feature = "mini-alloc")]
#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;
