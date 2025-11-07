
```ts

@fdsf()
const db = new Dexie('myDexie');

@sealed
class Apa {}

db.version(1).stores({
    friends: `
        ++id,
        name: Text,
        age
    `
});

```

