# CLAUDE.md - AI Assistant Guide for opensearch-ts

## Project Overview

**opensearch-ts** is a TypeScript library that provides strongly-typed interfaces for OpenSearch queries and responses. It wraps the official `@opensearch-project/opensearch` client to enable compile-time type checking and IDE autocomplete for complex OpenSearch Query DSL operations.

**Core Problem Solved**: Writing OpenSearch queries in TypeScript is error-prone due to complex nested JSON structures. Without types, developers must reference documentation constantly and can only catch errors at runtime. This library uses advanced TypeScript generics to infer response types from query structure.

**Version**: 1.2.2
**License**: ISC OR GPL-3.0
**Node Requirement**: >=14.15.0

## Repository Structure

```
opensearch-ts/
├── src/
│   ├── index.ts              # Main export file
│   ├── typescriptOS.ts       # TypescriptOSProxyClient - main client wrapper
│   ├── search.ts             # Search<T,A> type and OSQuery definitions
│   ├── aggInput.ts           # Aggregation input types (AggType, AggsQuery)
│   ├── aggOutput.ts          # Aggregation response types
│   ├── aggs.ts               # Individual aggregation type definitions
│   ├── fields.ts             # Field type helpers (DateField, NumberField, etc.)
│   ├── attributes.ts         # Attribute extraction types (StringAtt, NumberAtt)
│   ├── filters.ts            # Filter query types
│   ├── match.ts              # Match query types
│   ├── query.ts              # Additional query utilities
│   ├── utils.ts              # Utility functions
│   ├── logger.ts             # Logging utilities
│   ├── tests/                # Test files with sample data types
│   │   ├── Ecommerce.ts      # Sample type for ecommerce data
│   │   ├── ServerLog.ts      # Sample type for server logs
│   │   ├── Flight.ts         # Sample type for flight data
│   │   ├── bucket.test.ts    # Tests for bucket aggregations
│   │   ├── metric.test.ts    # Tests for metric aggregations
│   │   ├── pipeline.test.ts  # Tests for pipeline aggregations
│   │   ├── ecommercetest.test.ts
│   │   └── flights.test.ts
│   └── examples/             # Example query JSON files
│       ├── ecommerce.json
│       └── flight.json
├── docs/                     # Documentation and images
│   ├── files/
│   └── images/
├── .github/workflows/
│   └── npm-publish.yml       # CI/CD for npm publishing
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md                 # User-facing documentation
├── Tutorial.md               # In-depth tutorial on the type system
└── LICENSE
```

## Architecture & Key Concepts

### Core Type System Pattern

The library uses **generics with constraint types** to achieve type inference:

```typescript
Search<T, A extends AggsQuery>
```

- `T`: Document type in the index (e.g., `ServerLog`, `Ecommerce`)
- `A`: Aggregation query structure descriptor

This pattern enables:
1. **Query autocomplete**: IDE suggests valid fields based on document type
2. **Response type inference**: Return type is calculated from query structure
3. **Compile-time validation**: Invalid queries are caught before runtime

### Type Extraction Patterns

**Field Extraction** (src/attributes.ts):
- Uses recursive conditional types to extract deeply nested fields
- `StringAtt<T>`: Extracts all string field paths (e.g., "user.name")
- `NumberAtt<T>`: Extracts all number field paths
- `DateAtt<T>`: Extracts all Date field paths
- `KeyWord<T>`: Adds `.keyword` suffix to string fields

**Example**:
```typescript
type DeepKeysMatching<T, V> = T extends V ? "" :
  T extends Array<any> ? "" :
  T extends object ? {
    [K in keyof T]: Join<string & K, DeepKeysMatching<T[K], V>>
  }[keyof T] : never;
```

### Aggregation Type System

**Input Types** (src/aggInput.ts):
- `AggType`: Union of all supported aggregation types ("terms" | "avg" | "sum" | ...)
- `AggsQuery`: Recursive type describing nested aggregation structure
- `AggTypeDictionaryRecursive`: Maps literal aggregation names to their type definitions

**Output Types** (src/aggOutput.ts):
- `AggTypeResponseDictionary2`: Maps query structure to response structure
- Handles bucket aggregations with nested sub-aggregations
- Type-safe bucket arrays with correct value types

### Proxy Client Pattern

**TypescriptOSProxyClient** (src/typescriptOS.ts):
- Wraps the official OpenSearch client
- Main methods:
  - `searchTS<T, A>()`: Single search with typed response
  - `msearchTS<T, A>()`: Multi-search array
  - `msearchDictTS<T>()`: Multi-search dictionary (mutates requests with responses)
  - `countTs<T, A>()`: Count query
- Strips internal attributes (`_source`, `response`, `index`) before sending to OpenSearch
- Attaches response back to request object for type preservation

## Key Files Deep Dive

### src/index.ts
Main export file. Re-exports all public APIs. Start here to understand public interface.

### src/typescriptOS.ts
**TypescriptOSProxyClient class** - The main client users instantiate.

Key patterns:
- Accepts OpenSearch client in constructor
- Uses lodash `_.omit()` to strip metadata before queries
- Returns typed responses by casting `resp.body`
- Multi-search mutates request objects with responses (workaround for TypeScript limitations)

### src/search.ts
**Search<T, A> type** - The core type that defines query structure.

Contains:
- `Document<T>`: Represents a single document
- `Hits<T>`: Search results structure
- `OSQuery<T>`: All query types (bool, match, filter, etc.)
- `SearchResponse<T, A>`: Response structure with typed aggregations
- `ResponseParser`: Helper class for type casting

### src/aggInput.ts
Defines how aggregations are specified in queries.

Pattern:
```typescript
export type AggsQuery = {
  [key: string]: {
    agg: AggType,
    aggs?: AggsQuery  // Recursive for nested aggs
  }
}
```

### src/aggOutput.ts
Defines aggregation response structures. Mirrors input structure but with bucket/value results.

### src/aggs.ts
Individual aggregation type definitions:
- `TermsAgg<T>`: Terms aggregation
- `DateHistAgg<T>`: Date histogram
- `AvgAgg<T>`, `SumAgg<T>`, `MinAgg<T>`, `MaxAgg<T>`: Metric aggregations
- Bucket aggregations (histogram, range, etc.)
- Pipeline aggregations (bucket_script, derivative, etc.)

### src/attributes.ts
Type utilities for extracting document attributes:
- `AnyAttribute<T>`: All field paths
- `StatsAttribute<T>`: Fields valid for stats (number/date)
- `TextOrKeywordAtt<T>`: String fields for text queries
- `GeoPointAtt<T>`: GeoPoint fields

### src/fields.ts
Field type wrappers used in aggregation inputs:
- `Field<T>`: Base `{ field: T }` structure
- `DateField<T>`, `NumberField<T>`, `StringField<T>`, etc.

### src/filters.ts
Filter query types:
- `term`, `terms`, `range`, `exists`, `prefix`, `wildcard`, `regexp`, etc.
- `FilterStatement<T>`: Union of all filter types

### src/match.ts
Match query types:
- `Match<T>`: Full-text match
- `MatchPhrase<T>`: Phrase matching
- `MultiMatch<T>`: Multi-field matching

## Development Workflow

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```
- Compiles TypeScript to `dist/` directory
- Generates `.d.ts` declaration files
- Uses `tsconfig.json` settings (ES2019 target, CommonJS modules)

### Testing
```bash
npm test
```
- Uses Jest with ts-jest
- Test files: `src/**/*.test.ts`
- Requires OpenSearch instance for integration tests

### Publishing
Automated via GitHub Actions when version tags are pushed:
```bash
git tag v1.2.3
git push origin v1.2.3
```

Workflow (`.github/workflows/npm-publish.yml`):
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build package
5. Publish to npm with provenance

## Testing Conventions

### Test File Organization
- **Location**: `src/tests/*.test.ts`
- **Sample Types**: `Ecommerce.ts`, `ServerLog.ts`, `Flight.ts` - Generated from real documents
- **Test Categories**:
  - `bucket.test.ts`: Bucket aggregations (terms, histogram, date_histogram, etc.)
  - `metric.test.ts`: Metric aggregations (avg, sum, stats, etc.)
  - `pipeline.test.ts`: Pipeline aggregations (bucket_script, derivative, etc.)

### Test Pattern
```typescript
import { Search, TypescriptOSProxyClient } from '../index';
import { ServerLog } from './ServerLog';

const search: Search<ServerLog, {
  myAgg: {
    agg: "terms",
    aggs: {
      avgBytes: {
        agg: "avg"
      }
    }
  }
}> = {
  size: 0,
  aggs: {
    myAgg: {
      terms: { field: "agent.keyword" },
      aggs: {
        avgBytes: {
          avg: { field: "bytes" }
        }
      }
    }
  }
};

// Response is automatically typed
const result = await tsClient.searchTS({ body: search, index: "logs" });
result.aggregations.myAgg.buckets // Correctly typed!
```

### Generating Sample Types
Use [quicktype.io](https://quicktype.io/) or quicktype CLI:
```bash
quicktype document.json -o DocumentType.ts
```

## Code Conventions

### Naming Conventions
1. **Types**: PascalCase (e.g., `Search`, `AggsQuery`, `TypescriptOSProxyClient`)
2. **Type Parameters**: Single uppercase letter or PascalCase
   - `T`: Document type
   - `A`: Aggregation query structure
   - `AT`: Aggregation type
3. **Interfaces/Types**: Descriptive names
   - `*Agg`: Aggregation input types (e.g., `TermsAgg`, `AvgAgg`)
   - `*Att`: Attribute types (e.g., `StringAtt`, `NumberAtt`)
   - `*Field`: Field wrapper types (e.g., `DateField`, `NumberField`)
4. **Constants**: SCREAMING_SNAKE_CASE (e.g., `IGNORE_ATTS`)
5. **Variables**: camelCase

### File Organization
- One primary export per file when possible
- Related types grouped together
- Imports organized: external dependencies first, then internal
- Namespace imports for related utilities: `import * as agg from "./aggs"`

### Type Definition Patterns
1. **Use type aliases over interfaces** for union types and mapped types
2. **Export all public types** - Library is type-focused
3. **Leverage type-fest utilities**: `RequireAtLeastOne`, `RequireExactlyOne`, `Entries`
4. **Recursive types**: Define base case first, then recursive case

### Code Style
- **No semicolons** - Consistent with codebase style
- **Indentation**: Spaces (TypeScript default)
- **Quotes**: Double quotes for strings
- **Optional chaining**: Use when accessing potentially undefined properties

## Common Development Tasks

### Adding a New Aggregation Type

1. **Add to AggType union** (src/aggInput.ts):
```typescript
export type AggType =
  "existing_types" |
  "my_new_agg"
```

2. **Define input type** (src/aggs.ts):
```typescript
export type MyNewAgg<T> = {
  my_new_agg: {
    field: NumberAtt<T>,
    // ... other parameters
  }
}
```

3. **Add to input dictionary** (src/aggInput.ts):
```typescript
type AggTypeDictionary<T, AT extends AggType> =
  AT extends "my_new_agg" ? MyNewAgg<T> :
  // ... other types
```

4. **Define output type** (src/aggOutput.ts):
```typescript
export type MyNewAggResponse = {
  value: number,
  // ... response fields
}
```

5. **Add to output dictionary** (src/aggOutput.ts):
```typescript
type AggTypeResponseDictionary<T, AT extends AggType> =
  AT extends "my_new_agg" ? MyNewAggResponse :
  // ... other types
```

6. **Write tests** (src/tests/metric.test.ts or bucket.test.ts):
```typescript
test("my_new_agg aggregation", async () => {
  const search: Search<TestType, {
    test: { agg: "my_new_agg" }
  }> = { /* ... */ };
  // ...
});
```

### Adding a New Query Type

1. **Define query type** (src/filters.ts or src/match.ts):
```typescript
export type MyQuery<T> = {
  my_query: {
    [field in StringAtt<T>]: {
      value: string,
      // ... parameters
    }
  }
}
```

2. **Add to query union** (src/search.ts):
```typescript
export type OSQuery<T> = {
  my_query?: MyQuery<T>,
  // ... existing queries
}
```

3. **Test the new query type**

### Adding Support for New Field Types

1. **Add attribute extractor** (src/attributes.ts):
```typescript
export type MyFieldTypeAtt<T> = DeepKeysMatching<T, MyFieldType>
```

2. **Add field wrapper** (src/fields.ts):
```typescript
export type MyFieldTypeField<T> = Field<MyFieldTypeAtt<T>>
```

3. **Update relevant aggregations** to accept the new field type

## Important Considerations for AI Assistants

### Type System Limitations

1. **No direct multi-search response typing**: TypeScript cannot map individual dictionary values to different types. The library uses a workaround by mutating request objects with responses. This preserves type information but violates functional programming principles.

2. **Arrays are ignored in field extraction**: The `DeepKeysMatching` type explicitly ignores arrays to prevent complex type recursion issues.

3. **Partial aggregation support**: Not all OpenSearch aggregations are implemented. Check `AggType` union for supported types.

### When Making Changes

1. **NEVER modify type extraction logic** (src/attributes.ts) without thorough understanding - it's the foundation of the entire type system

2. **Test with real OpenSearch instance** - Type safety doesn't guarantee OpenSearch API compatibility

3. **Preserve generic patterns** - The library relies heavily on:
   - Mapped types: `{ [K in keyof A]: ... }`
   - Conditional types: `AT extends "terms" ? X : Y`
   - Recursive types: Types that reference themselves
   - Template literal types: ``${T}.${U}``

4. **Maintain backwards compatibility** - Users define complex types that depend on the public API

5. **Document complex types** - TypeScript's type errors can be cryptic with deep generics

### Multi-Search Pattern

The multi-search implementation is unusual:

```typescript
const searches = { query1: search1, query2: search2 };
await client.msearchDictTS(searches, "index");
// searches are now mutated with responses
searches.query1.response // typed correctly!
```

This pattern:
- Mutates input objects (side effect)
- Preserves type information through the generic parameter
- Is necessary due to TypeScript limitations with heterogeneous collections
- Should be documented when helping users

### TypeScript Compiler Considerations

- **Long compile times**: Complex generic types can slow down IDE
- **Type instantiation depth**: Very deep nesting may hit TypeScript limits
- **Inference failures**: Sometimes explicit type annotations are required

### Version Dependencies

- **@opensearch-project/opensearch**: ^3.2.0 - Keep in sync with OpenSearch releases
- **TypeScript**: ^4.1.3 - Minimum version for template literal types
- **type-fest**: ^4.15.0 - Utility types dependency

### Common Pitfalls

1. **Forgetting to specify generic parameters**: `Search` requires both `T` and `A`
2. **Mixing field paths**: Using "field" instead of "field.keyword" for string aggregations
3. **Incorrect aggregation nesting**: Response structure mirrors query structure
4. **Assuming all OpenSearch features are supported**: Check documentation for coverage

## Reference Materials

- **Official OpenSearch Docs**: https://opensearch.org/docs/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Tutorial.md**: In-depth explanation of type system design
- **README.md**: User-facing usage documentation
- **Test files**: Real-world usage examples

## Summary for Quick Reference

**Primary Entry Point**: `TypescriptOSProxyClient` wraps OpenSearch client
**Core Type**: `Search<DocumentType, AggQueryDescriptor>`
**Key Pattern**: Generics + recursive types + conditional types = inferred response types
**Testing**: Jest, requires OpenSearch instance
**Build**: `npm run build` → TypeScript → `dist/`
**Publish**: Git tag triggers GitHub Actions → npm

When in doubt, refer to existing aggregation implementations in `src/aggs.ts` and test examples in `src/tests/` for patterns to follow.
