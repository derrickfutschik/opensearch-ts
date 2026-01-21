import * as _ from "lodash"
import * as os from "@opensearch-project/opensearch"
import { TransportRequestOptions } from "@opensearch-project/opensearch/lib/Transport"
import * as q from "./search"

import { ResponseParser } from "./search"

import type { Entries } from 'type-fest';
import { AggsQuery } from "./aggInput"


export const IGNORE_ATTS = ["_source", "response", "index"]


export type DictResponse<T, MSEARCH extends { [a: string]: q.Search<T, AggsQuery> }> =
    {
        [K in keyof MSEARCH]: q.SearchResponse<T, AggsQuery>
    }


export type MSearch<T> = { [key: string]: q.Search<T, AggsQuery> }

export type CountResponse = {
    "count": number,
    "_shards": {
        "total": number,
        "successful": number,
        "skipped": number,
        "failed": number
    }
}

export class TypescriptOSProxyClient {

    esClient: os.Client

    constructor(esClient: os.Client) {
        this.esClient = esClient
    }

    async countTs<T, A extends AggsQuery>(search: {
        body: q.SearchRequest<T, A>,
        index?: string
    }, options?: TransportRequestOptions) {
        return this.esClient.count({
            index: search.body.index || search.index,
            body: _.omit(search.body, IGNORE_ATTS)
        },
            options)
            .then(resp => {
                return resp.body as CountResponse
            })
    }

    async searchTS<T, A extends AggsQuery>(search: {
        body: q.SearchRequest<T, A> | q.Search<T, A>,
        index?: string
    }, options?: TransportRequestOptions): Promise<q.SearchResponse<T, A>> {
        const body = search.body as q.SearchRequest<T, A> & { index?: string }
        return this.esClient.search({
            index: body.index || search.index,
            body: _.omit(search.body, IGNORE_ATTS)
        },
            options)
            .then(resp => {
                const response = resp.body as q.SearchResponse<T, A>
                ;(search.body as q.Search<T, A>).response = response
                return response
            })
    }

    async msearchDictTS<T>(search: { [k: string]: any }, index?: string)
        : Promise<void> {

        const msearch = search as MSearch<T>
        const entries = Object.entries(msearch) as Entries<MSearch<T>>;
        const queries = entries.map(([, value]) => value)
        const keys = entries.map(([key,]) => key)

        await this.msearchTS(queries, index)

        keys.forEach((key, i) => {
            search[key] = queries[i]
        })

    }

    async msearchTS<T, A extends AggsQuery>(
        msearchTs: q.SearchRequest<T, A>[], index?: string, options?: TransportRequestOptions)
        : Promise<q.SearchResponse<T, A>[]> {


        const msearch = msearchTs.flatMap(s => [{
            index: s.index || index
        }, _.omit(s, IGNORE_ATTS)])

        const responses = (await this.esClient.msearch({ body: msearch, index }, options)).body.responses
        responses.forEach((resp, i) => {
            (msearchTs[i] as q.Search<T, A>).response = resp as q.SearchResponse<T, A>
        });

        return msearchTs.map((search, i) => new ResponseParser(search as q.Search<T, A>).parseSearchResponse(responses[i]))

    }



}