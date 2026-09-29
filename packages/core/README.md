# @very-coffee/statespace

## Typing / registries

Prefer `StateSpace<T>` at machine definition sites. Use `AnyStateSpace` / `eraseStateSpace` (and the executable parallels) only when putting spaces into a mixed collection. Calling `apply` / `enabled` on an erased space means you are responsible for passing a state that matches the original `T`.
