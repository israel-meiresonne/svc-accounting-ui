import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import CategoryFilter from "@/components/category-filter/category-filter"

const CATEGORIES = ["Groceries", "Rent", "Transfers"]

function renderFilter(includedCategories: string[] = []) {
  const onIncludedCategoriesChange = jest.fn()
  const user = userEvent.setup()

  render(
    <CategoryFilter
      categories={CATEGORIES}
      includedCategories={includedCategories}
      onIncludedCategoriesChange={onIncludedCategoriesChange}
    />
  )

  return { onIncludedCategoriesChange, user }
}

describe("<CategoryFilter />", () => {
  it('labels the trigger "All categories" when nothing is selected', () => {
    renderFilter([])

    expect(screen.getByRole("button", { name: "All categories" })).toBeInTheDocument()
  })

  it("labels the trigger with the number of selected categories", () => {
    renderFilter(["Rent", "Transfers"])

    expect(screen.getByRole("button", { name: "2 selected" })).toBeInTheDocument()
  })

  it("adds a category to the selection when an unchecked one is clicked", async () => {
    const { onIncludedCategoriesChange, user } = renderFilter(["Rent"])

    await user.click(screen.getByRole("button", { name: "1 selected" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Groceries" }))

    expect(onIncludedCategoriesChange).toHaveBeenCalledWith(["Rent", "Groceries"])
  })

  it("removes a category from the selection when a checked one is clicked", async () => {
    const { onIncludedCategoriesChange, user } = renderFilter(["Rent", "Groceries"])

    await user.click(screen.getByRole("button", { name: "2 selected" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Rent" }))

    expect(onIncludedCategoriesChange).toHaveBeenCalledWith(["Groceries"])
  })

  it("selects every category with Select all", async () => {
    const { onIncludedCategoriesChange, user } = renderFilter([])

    await user.click(screen.getByRole("button", { name: "All categories" }))
    await user.click(screen.getByRole("button", { name: "Select all" }))

    expect(onIncludedCategoriesChange).toHaveBeenCalledWith(CATEGORIES)
  })

  it("clears the selection with Reset", async () => {
    const { onIncludedCategoriesChange, user } = renderFilter(["Rent"])

    await user.click(screen.getByRole("button", { name: "1 selected" }))
    await user.click(screen.getByRole("button", { name: "Reset" }))

    expect(onIncludedCategoriesChange).toHaveBeenCalledWith([])
  })

  it("stays open after a category is toggled", async () => {
    const { user } = renderFilter([])

    await user.click(screen.getByRole("button", { name: "All categories" }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Groceries" }))

    expect(screen.getByRole("menuitemcheckbox", { name: "Rent" })).toBeInTheDocument()
  })

  it("shows an explanatory row instead of an empty menu when there are no categories", async () => {
    const user = userEvent.setup()
    render(<CategoryFilter categories={[]} includedCategories={[]} onIncludedCategoriesChange={jest.fn()} />)

    await user.click(screen.getByRole("button", { name: "All categories" }))

    expect(screen.getByText("No categories yet")).toBeInTheDocument()
  })
})
