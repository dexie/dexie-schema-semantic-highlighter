```ts

const db = new Dexie('myDexie').version(1).stores({
  friends: table<Friend>`
    ++id
    name: Collated
    age
    doc: Y.Doc
  `,
  pets: table(Pet)`
    @id
    name
    age
    doc: Y.Doc  `
});

class MyDexie extends Dexie {

  // Friends table
  friends = Table<Friend> `
    ++id
  `
  // Pets table
  pets = Table(Pet)`
    @id
  `
};

const db = new Dexie("myDb").stores({
  friends: Table<Friend> `
    ++id
  `
});



class Pet extends Model<{pets: Pet, friends: Friend}> {

}

export interface Friend {
  id: number;
  name: string;
  age: number;
}

export const friends = schema<Friend>`
  ++id
  name: Collated
  age
`;


const db = new Dexie("myDB").version(1).stores(Schema);


// Friend.ts
export const friends = declareTable<Friend>`
  ++id
  name
  age     # Age index
`

export class Friend extends Model<typeof { friends, pets }> {
  id!: string
  name!: string
  age!: number

  addPet(pet: typeof pets.InsertType) {
    this.db.pets.add({...pet, friendId: this.id})
  }
}

  pets = model(Pet)`
    @id: UUIDv7
    name: IgnoreCase
  `
}

export class Pet extends Model<Schema, 'pets' | 'friends'> {
}

```
