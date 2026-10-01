import { parseIncludedCategories, setIncludedCategories } from "@/lib/categories/included-categories-param"

describe("parseIncludedCategories", () => {
  it("splits the comma-joined param into categories", () => {
    expect(parseIncludedCategories(new URLSearchParams("included_categories=Rent,Fees"))).toEqual(["Rent", "Fees"])
  })

  it("returns an empty list when the param is absent or empty", () => {
    expect(parseIncludedCategories(new URLSearchParams())).toEqual([])
    expect(parseIncludedCategories(new URLSearchParams("included_categories="))).toEqual([])
  })

  it("drops empty entries", () => {
    expect(parseIncludedCategories(new URLSearchParams("included_categories=Rent,,Fees,"))).toEqual(["Rent", "Fees"])
  })
})

describe("setIncludedCategories", () => {
  it("writes the categories comma-joined", () => {
    const params = setIncludedCategories(new URLSearchParams("interval=month"), ["Rent", "Fees"])

    expect(params.get("included_categories")).toBe("Rent,Fees")
    expect(params.get("interval")).toBe("month")
  })

  it("removes the param entirely for an empty selection", () => {
    const params = setIncludedCategories(new URLSearchParams("included_categories=Rent"), [])

    expect(params.has("included_categories")).toBe(false)
  })
})
