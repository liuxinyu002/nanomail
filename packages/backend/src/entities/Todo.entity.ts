import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  type Relation
} from 'typeorm'
import { Email } from './Email.entity'
import { BoardColumn } from './BoardColumn.entity'

export type TodoStatus = 'pending' | 'in_progress' | 'completed'

/**
 * Todo Entity
 *
 * Note: urgency field is deprecated - task status is now determined by boardColumnId
 * - boardColumnId: The column the todo belongs to (Inbox, Todo, In Progress, Done, etc.)
 * - position: Order within the column for drag-and-drop sorting
 */
@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'integer' })
  emailId!: number

  @ManyToOne(() => Email, (email) => email.todos)
  email!: Relation<Email>

  @Column({ type: 'text' })
  description!: string

  @Column({
    type: 'text',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  })
  status!: TodoStatus

  /**
   * Deadline for the todo item
   * Stored as UTC datetime (with Z suffix) to ensure timezone consistency
   * Set from LLM-extracted deadline in YYYY-MM-DD format, converted to end of day UTC
   */
  @Column({ type: 'datetime', nullable: true })
  deadline!: Date | null

  /**
   * The board column this todo belongs to
   * NOT nullable - all todos must belong to a column
   * Default: 1 (Inbox)
   */
  @Column({ type: 'integer', default: 1 })
  boardColumnId!: number

  @ManyToOne(() => BoardColumn, (column) => column.todos)
  boardColumn!: Relation<BoardColumn>

  /**
   * Position within the column for ordering
   * Used for drag-and-drop sorting within a column
   */
  @Column({ type: 'integer', default: 0 })
  position!: number

  /**
   * Optional notes for the todo item
   * Max 2000 characters, can be null
   */
  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}