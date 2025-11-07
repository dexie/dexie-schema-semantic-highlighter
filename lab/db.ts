import Dexie from "dexie";

const db = new Dexie("myDexie");

db.version(1).stores({
  friends: `
    ++id
    name: Text    # Case insensitive name
    age           # Indexing age
    doc: Y.Doc 
    [name+age]    # Compound index on name and age
    address.city  # Indexing city inside address object
  `,
  pets: `
    ++id
    name          # Indexing pet name
    type          # Indexing pet type
    ownerId       # Indexing owner ID
  `
});

const x = {
  friends: {
    id: 1,
    name: "Alice",
    age: 30,
    doc: "kj",
    address: {
      city: "Wonderland"
    }
  }
};